   MikroOrmModule.forRoot({
    entities: [...CRUDEntities],
    driver: tk_orm_driver,
    dbName: tk_db_name,
    password: 'admin',
    user: 'admin',
   }),
   EICRUDModule.forRoot(),