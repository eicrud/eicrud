# Contributing to Eicrud

- [Submitting an Issue](#submitting-an-issue)
- [Contributing](#contributing)
- [Commit Message Guidelines](#commit-message-guidelines)

## Submitting an Issue
Before you submit an issue, please search the issue tracker, maybe an issue for your problem already exists.

### Got a Question or Problem?

Do not open issues for general support questions, GitHub issues are for bug reports and feature requests. You can start a [discussion](https://github.com/eicrud/eicrud/discussions) instead.

### Before you start coding

If you want to implement a new feature of bugfix please submit an issue with a proposal for your work first.

## Contributing

`git clone https://github.com/eicrud/eicrud`

### Prerequisites

- a mongodb server listening on localhost:27017
- a postgresql server listening localhost:5432
- nodejs (>= 18.x) installed

Make sure to run all the test suites to ensure your setup is working :

```
npm run test 

npm run test:postgre

npm run start:test-ms

npm run start:test-ms:proxy

./test/test-cli.sh
```

### Testing your code

Every new feature or bug fix must include specification tests. Consider writing the tests as you develop instead of testing by hand with tools like Postman.

Please copy the other tests' structure and use the helper methods (`testMethod`, `createAccountsAndProfiles`, etc). 

Never call the orm directly but use the CRUDService methods instead (ex: `userService.$find`).

Ensure all the test suites are passing before submitting your merge request.

## Commit Message Guidelines

Each **merge** commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer than 100 characters.

Footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.


### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- **chore**: Updating tasks etc; no production code change
- **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests


### Scope

The following is the list of supported scopes:

- **core**: for changes made on `core` directory
- **client**: for changes made on `client` directory
- **cli**: for changes made on `cli` directory
- **test**: for changes made on `test` directory
- **db_mongo**: for changes made on `db_mongo` directory
- **db_postgre**: for changes made on `db_postgre` directory

If your change affects more than one package, separate the scopes with a comma (e.g. `client,core`).


### Subject

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

A detailed explanation can be found in this [document][commit-message-format].

[commit-message-format]: https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#
