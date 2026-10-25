# Data files

## AQI observations used by the app

`aqi.csv` is the project's India city-day AQI dataset. It contains `date`, `area`, `state`, `aqi_value`, and status/source fields, with 235,785 rows across 291 areas from 2022-04-01 to 2025-04-30. The API aggregates repeated area/date rows and uses this file for AQI history and AQI-only forecasts.

## Supplementary CPCB pollutant readings

`cpcb_caaqm_daily_pm_2025-05_to_2025-09.csv` contains daily station readings for PM2.5 and PM10 from May 1 through September 1, 2025. The API joins station readings to `cpcb_caaqm_stations.csv` and aggregates station daily means by city/date for the UI's historical PM charts. It does not convert these pollutant concentrations into AQI.

The source and retrieval notes are in `cpcb_caaqm_source.json`. Data source: XKDR Forum's India Air Quality Database, sourced from CPCB's CAAQM network; license: CC BY 4.0. Readings are published as received and are not validated or gap-filled. The archive's overview metadata listed a later final month, but direct queries returned no rows after 2025-09-01, so this project records only the observed coverage.

To refresh the supplementary download, run `python data/download_cpcb_daily.py`. The script queries the public archive in bounded date chunks. Set `XKDR_API_KEY` to your own key if desired; otherwise it uses the archive's published demo key. Review `data/cpcb_caaqm_source.json` after refreshing because archive coverage can change.

## Legacy source files

`city_day.csv`, `city_hour.csv`, `station_day.csv`, `station_hour.csv`, and `stations.csv` are retained as the earlier Kaggle India air-quality data release (2015–2020). They are no longer the source for the current AQI dashboard API.
