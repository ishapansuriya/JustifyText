# JustifyText

- To Perform this operation you need postman and sql database named justifytext with one table named users with two fields id and email.
- Then atleast insert one user.

## Run

- For **Token** go to postman and type below url with params and add key named email with value of email that you inserted in the database like " abc@xyz.com".

```
localhost URL: 3000 / api / token
```

- As response you get token that will allow you to justify text.
- To **justify text** use below url and add authorization as key and token as value in headers.

```
localhost: 3000 / api / justify
```

- Insert your text as raw in body.
