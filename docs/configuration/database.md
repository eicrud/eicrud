The database access configuration is done through [Mikro-orm](https://mikro-orm.io/){:target="_blank"} via the `MikroOrmModule`.

```typescript title="app.module.ts"
@Module({
  imports: [
    //...
   MikroOrmModule.forRoot({
      entities: [...CRUDEntities],
      driver: MongoDriver,
      dbName: "cli-app-db",
    }),
  ],
    //...
})
export class AppModule {}
```

Check out [Mikro-orm's documentation](https://mikro-orm.io/docs/configuration#connection){:target="_blank"} for more info.

## Multiple Databases

Each [CrudServices](../services/definition.md) takes an optional Mikro-orm instance that can be used to connect to another database. It will replace the global instance.

```typescript title="user.service.ts"
const myOrm = await MikroORM.init({
  entities: [User],
  dbName: 'my-db-name',
  //...
});

@Injectable()
export class UserService extends CrudUserService<User> {
    constructor(/* ... */) {
        super( /* ... */, { orm: myOrm })
 }
    //..
}
```

!!! note
    Splitting your database might prevent you from using the [populate](https://mikro-orm.io/docs/populating-relations){:target="_blank"} option in your queries.