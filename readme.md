uploads
========
A simple file hosting service.

## Users
The addition of new users is done manually by directly inserting a new user
into the database. The password field should contain a bcrypt hash.
e.g.
```sql
INSERT INTO user VALUES(
    'username',
    '$2a$10$8SAUmj17G24UlTQQ8gopquyZga.cUtawdbEcj5uLoPf0ZwjrIP9O6'
);
```

## Dependencies
Run `sudo npm install` and `gulp` in the project root.

## Configuration
By default the configuration in config/default.json will be used. Custom
configuration can be provided by making a config/custom.json file.
