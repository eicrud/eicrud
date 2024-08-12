
---
description: Eicrud's CLI lets you generate an OpenAPI schema specifying all your services' CRUD and command endpoints.
---

Eicrud's [CLI](https://www.npmjs.com/package/@eicrud/cli) lets you generate an [OpenAPI](https://www.openapis.org/){:target="_blank"} schema specifying all your services' CRUD and command endpoints. 

!!! info 
    This allows for integration with OpenAPI tools such as [Swagger](https://swagger.io/){:target="_blank"}, [Postman](https://www.postman.com/){:target="_blank"} and even [OpenAPI Generator](https://openapi-generator.tech/){:target="_blank"} which lets you generate clients for many languages (java, swift, python... etc.).

## Generate a schema

To generate a basic schema simply run.

```shell
eicrud export dtos
eicrud export openapi -o-jqs
```
!!! note
    The option `-o-jqs` ensures maximum compatibility with generators but suppresses the typing of JSON query parameters

### Example of a generated schema

```yaml title="eicrud-open-api.yaml"
openapi: 3.0.0
info:
servers:
components:
paths:
  /crud/s/user-profile/one:
    get:
    post:
    patch:
    delete:
      summary: Delete a UserProfile
      parameters: 
      responses:  
  /crud/s/user-profile/batch:
  /crud/s/user-profile/many:
  /crud/s/user-profile/in:
  /crud/s/user-profile/ids:
  /crud/s/user-profile/cmd/can_cannot_cmd:
  /crud/s/user-profile/cmd/search:
```

You can override parts of the generated schema in `eicrud-cli.json`.
```json title="eicrud-cli.json"
{
    "export": {
        // ...
        "openApiBaseSpec": {
            "info": {
                "title": "My Api",
                "version": "2.0.0",
            },
            "servers": [
                {
                    "description": "Production server",
                    "url": "https://prod-domain:3000"
                }
            ]
        }
    }
}
```

## Generate with types

You can use the [typeconv package](https://www.npmjs.com/package/typeconv) to convert your DTOs


!!! warning
    To generate DTOs with the convert classes (`-cc`) option correctly, every `class`, `interface` and `type` in your `*.entity.ts` and `*.dto.ts` file must be exported. Additionally, every class member must be separated by a semicolon `;`. This allows the script to remove initialisations.

## Exclude paths & troubleshooting
Just like the super-client's export, the OpenAPI export depends on the generated DTOs,
check out the [exclude](super-client.md#exclude-files-from-the-export) and [troubleshooting](super-client.md#troubleshooting) sections for more info.
