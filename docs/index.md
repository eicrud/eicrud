

**Eicrud** is CRUD/Authorization framework meant to extend a [Nestjs](https://github.com/nestjs/nest){:target="_blank"} application. It is works with [MikroOrm](https://mikro-orm.io/){:target="_blank"} entities  guarded with [CASL](https://casl.js.org){:target="_blank"} and [class-validator](https://github.com/typestack/class-validator){:target="_blank"}.


## Philosophy
Most of the time, a web app have some CRUD functionality at its base. EICRUD attempt to abstract this into an simple and easy to use API, so you don't have to re-write boilerplate code (controllers, validations, db queries...) everytime you need a new service. By centring everything around entities, EICRUD provides a framework for writing complex applications that are easy to read, test and maintain.

## Compatibility 

- **HTTP platform**: [Fastify](https://fastify.dev){:target="_blank"}
- **Databases**: [MongoDB](https://www.mongodb.com/docs/v5.0/tutorial/convert-replica-set-to-replicated-shard-cluster){:target="_blank"} and [PostgreSQL](https://www.postgresql.org/){:target="_blank"}.  
(others supported by [Mikro-orm](https://mikro-orm.io) could work but needs a custom dbAdapter){:target="_blank"}

## Getting started

Checkout the installation [guide](/1.%20Installation).
