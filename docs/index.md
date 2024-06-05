

**Eicrud** is CRUD/Authorization framework meant to extend a [Nestjs](https://nestjs.com){:target="_blank"} application. It works with [Mikro-orm](https://mikro-orm.io/){:target="_blank"} entities  guarded with [CASL](https://casl.js.org){:target="_blank"} and [class-validator](https://github.com/typestack/class-validator){:target="_blank"}.


## Philosophy
Most of the time, a web app has some CRUD functionality as its base. Eicrud attempts to abstract this into a simple and easy-to-use API, so you don't have to re-write boilerplate code (controllers, validations, db queries...) every time you need a new service. By centering everything around CRUD entities, Eicrud provides a framework for writing complex applications that are easy to read, test and maintain. Eicrud also emphasizes "default security" for its components, where everything is forbidden until allowed.

## Compatibility 
- **HTTP platform**: [Fastify](https://fastify.dev){:target="_blank"}
- **Databases**: [MongoDB](https://www.mongodb.com/docs/v5.0/tutorial/convert-replica-set-to-replicated-shard-cluster){:target="_blank"} and [PostgreSQL](https://www.postgresql.org/){:target="_blank"}  
(others supported by [Mikro-orm](https://mikro-orm.io){:target="_blank"} may work with a custom dbAdapter)

## Getting started
Check out the installation [guide](./installation.md).
