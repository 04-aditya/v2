# v2


## development environment

* nodejs v18
* docker
  - redis
  ```
  $ docker run redis
  ```
  - timescaledb
  ```sh
  $ docker run -d --name timescaledb -p 127.0.0.1:5432:5432 \
        -v ~/timescaledbdata:/var/lib/postgresql/data \
        -e POSTGRES_PASSWORD=password timescale/timescaledb:latest-pg14

  # connect to db
  $ docker exec -it timescaledb psql -U postgres
  ```

  create .env.local in packages/api & packages/dash by copying the .env.example
