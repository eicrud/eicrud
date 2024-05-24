

**Eicrud** is CRUD/Authorization framework meant to extend a [Nestjs](https://github.com/nestjs/nest) application. It is works with [MikroOrm](https://mikro-orm.io/) entities  guarded with [CASL](https://casl.js.org) and [class-validator](https://github.com/typestack/class-validator).


## Philosophy
Most of the time, a web app have some CRUD functionality at its base. EICRUD attempt to abstract this into an simple and easy to use API, so you don't have to re-write boilerplate code (controllers, validations, db queries...) everytime you need a new service. By centring everything around entities, EICRUD provides a framework for writing complex applications that are easy to read, test and maintain.

