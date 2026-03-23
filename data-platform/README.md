# Data Platform (Blueprint Scaffold)

This folder matches the `documentation.md` data architecture blueprint.

It provides **placeholder pipelines** you can run later with PySpark/Spark Operator, plus a lakehouse directory layout:

- `storage/bronze`: raw parquet ingestion
- `storage/silver`: cleaned delta tables
- `storage/gold`: aggregated metrics

The code here is intentionally minimal so you can wire real sources (Kafka, Postgres CDC, S3) and sinks (Delta Lake, Feast) incrementally.

