# Amazon Reconciliation Guide

This flow assumes three source sheets:

- `B2C`: order detail rows
- `Unified Transaction`: delivered transactions with settlement values
- `Return AZ`: return / undelivered outcomes

## Target Output

Create one consolidated row per `order_id + sku` with:

- `order_id`
- `sku`
- `invoice_amount`
- `settlement`
- `status`
- `reconciliation_key`

Recommended key:

```text
order_id|sku|settlement|status
```

## Status Rules

1. If `order_id + sku` exists in `Unified Transaction`:
   - `status = delivered`
   - `settlement = SUM(transaction_value)`
2. Else, if `order_id + sku` exists in `Return AZ`:
   - If `reason` contains `UNDELIVERABLE_UNKNOWN`, `UNDELIVERABLE_REFUSED`, or `UNWANTED_ITEM`:
     - `status = RTO`
   - Otherwise:
     - `status = RTV`
3. Else:
   - `status = not delivered`

## Excel / Google Sheets Setup

Assume:

- `B2C` columns: `A=order_id`, `B=sku`, `C=invoice_amount`, `D=quantity`
- `Unified Transaction` columns: `A=order_id`, `B=sku`, `C=transaction_value`
- `Return AZ` columns: `A=order_id`, `B=sku`, `C=reason`

### 1. Fill missing SKU for repeated quantity rows

If one order has quantity `3` but SKU appears only on the first line, fill down in `B2C!B2`:

```excel
=IF(B2<>"",B2,B1)
```

Copy downward after sorting each order together.

### 2. Delivered settlement lookup

In output `D2` for `settlement`:

```excel
=SUMIFS('Unified Transaction'!$C:$C,'Unified Transaction'!$A:$A,A2,'Unified Transaction'!$B:$B,B2)
```

### 3. Return reason lookup

In output `E2` for a raw return reason:

```excel
=IFERROR(XLOOKUP(A2&"|"&B2,'Return AZ'!$A:$A&"|"&'Return AZ'!$B:$B,'Return AZ'!$C:$C,""),"")
```

In older Excel or Google Sheets, use:

```excel
=IFERROR(INDEX('Return AZ'!$C:$C,MATCH(A2&"|"&B2,ARRAYFORMULA('Return AZ'!$A:$A&"|"&'Return AZ'!$B:$B),0)),"")
```

### 4. Final status

In output `F2`:

```excel
=IF(D2>0,"delivered",IF(E2="","not delivered",IF(OR(ISNUMBER(SEARCH("UNDELIVERABLE_UNKNOWN",E2)),ISNUMBER(SEARCH("UNDELIVERABLE_REFUSED",E2)),ISNUMBER(SEARCH("UNWANTED_ITEM",E2))),"RTO","RTV")))
```

### 5. Reconciliation key

In output `G2`:

```excel
=A2&"|"&B2&"|"&TEXT(D2,"0.00")&"|"&F2
```

### 6. Search by order ID

If `J1` contains the order you want to search, filter with:

```excel
=FILTER(A:G,A:A=J1)
```

## Python Example

```python
import pandas as pd

b2c = pd.read_csv("b2c.csv")
txn = pd.read_csv("unified_transaction.csv")
ret = pd.read_csv("return_az.csv")

# Fill missing SKU values within the same order block
b2c["sku"] = b2c["sku"].replace("", pd.NA).ffill()

base = b2c[["order_id", "sku", "invoice_amount"]].copy()

txn_summary = (
    txn.groupby(["order_id", "sku"], as_index=False)["transaction_value"]
    .sum()
    .rename(columns={"transaction_value": "settlement"})
)

ret_summary = ret[["order_id", "sku", "reason"]].drop_duplicates(["order_id", "sku"])

final = base.merge(txn_summary, on=["order_id", "sku"], how="left")
final = final.merge(ret_summary, on=["order_id", "sku"], how="left")
final["settlement"] = final["settlement"].fillna(0)

rto_reasons = {
    "UNDELIVERABLE_UNKNOWN",
    "UNDELIVERABLE_REFUSED",
    "UNWANTED_ITEM",
}

def resolve_status(row):
    if row["settlement"] > 0:
        return "delivered"
    reason = str(row.get("reason", "") or "")
    if not reason:
        return "not delivered"
    return "RTO" if any(token in reason for token in rto_reasons) else "RTV"

final["status"] = final.apply(resolve_status, axis=1)
final["reconciliation_key"] = (
    final["order_id"].astype(str)
    + "|"
    + final["sku"].astype(str)
    + "|"
    + final["settlement"].map(lambda value: f"{value:.2f}")
    + "|"
    + final["status"]
)

print(final[["order_id", "sku", "invoice_amount", "settlement", "status", "reconciliation_key"]])
```

## Example Outcomes

| order_id | sku | transaction match | return reason | final status |
| --- | --- | --- | --- | --- |
| `AMZ-5001` | `MNC-BLK-TSHIRT-S` | yes | blank | `delivered` |
| `AMZ-5002` | `JPC-OVERSHIRT-M` | no | `UNDELIVERABLE_REFUSED` | `RTO` |
| `AMZ-5003` | `JPC-CARGO-30` | no | `CUSTOMER_DAMAGED_RETURN` | `RTV` |
| `AMZ-5004` | `MNC-GRN-POLO-L` | no | blank | `not delivered` |
