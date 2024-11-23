---
description: Here is how to get started with an Eicrud project.
comments: true
---

Eicrud plugs itself on a working [NestJS](https://nestjs.com){:target="_blank"} application (configured with [Fastify](https://fastify.dev){:target="_blank"}). You'll need a database server ([MongoDB](https://www.mongodb.com/docs/v5.0/tutorial/convert-replica-set-to-replicated-shard-cluster){:target="_blank"} or [PostgreSQL](https://www.postgresql.org/){:target="_blank"}) listening on the right port.

## Install with the CLI (recommended)

It is recommended to use Eicrud's [CLI](https://www.npmjs.com/package/@eicrud/cli){:target="_blank"} throughout all your developments since it will maintain a proper directory structure.

First create your nest app as specified in the [NestJS documentation](https://docs.nestjs.com/#installation){:target="_blank"}.

```
 npm i -g @nestjs/cli
 nest new project-name
 cd project-name
```

Then use the CLI to setup your project.

=== "mongoDB"
    ```
    npm i -g @eicrud/cli
    eicrud setup mongo project-name 
    ```

=== "postgreSQL"
    ```
    npm i -g @eicrud/cli
    eicrud setup postgre project-name 
    ```

## Install with git

Alternatively, you can pull a ready app from the [starter repository](https://github.com/eicrud/eicrud-starter){:target="_blank"}.
```
git clone https://github.com/eicrud/eicrud-starter.git project-name
cd project-name
npm install
```

## Post Installation

Eicrud needs a secret key to sign JWT tokens, which are used during [authentication](./configuration/authentication.md). You can generate a new one using the `node:crypto` module.
```
node -e "console.log(require('crypto').randomBytes(256).toString('base64'));"
```
Store it in a `.env` file at the root of your project.
``` title=" project-name/.env"
JWT_SECRET=<generated_jwt_secret>
```

You also need a local (or remote) database server to use Eicrud. Once you have it running, verify your connection. Check out [Mikro-orm's configuration](https://mikro-orm.io/docs/configuration#connection){:target="_blank"} for more info.
```typescript title=" project-name/app.module.ts"
// ...
   MikroOrmModule.forRoot({
    entities: [...CRUDEntities],
    driver: MongoDriver,
    dbName: "myapp-db",
   }),
// ...
```
You can start your application to make sure that everything is working.
```
npm run start
```