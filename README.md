# apollo-restify

This is a implementation of Apollo Server 2 as Restify middleware.

## Installing

```bash
npm install apollo-restify
```

## Using

```js
import restify from 'restify';
import { ApolloServer } from 'apollo-restify';

const server = restify.createServer();

const apolloServer = new ApolloServer({
  // Configuration for the apollo server.
  // Options documented here: https://www.apollographql.com/docs/apollo-server/api/apollo-server#constructoroptions-apolloserver */
});

// Playground:
server.get('/graphql', apolloServer.createHandler());
// Data endpoint:
server.post('/graphql', apolloServer.createHandler());
```

### Adding the Healthcheck Endpoint

```js
import { HEALTH_CHECK_URL } from 'apollo-restify';
server.get(HEALTH_CHECK_URL, apolloServer.createHealthCheckHandler());
```
