CREATE DATABASE uploads;

USE uploads;

SET NAMES utf8mb4;

CREATE TABLE user (
    username VARCHAR(50) NOT NULL,
    password VARCHAR(60) NOT NULL,
    PRIMARY KEY(username)
);

CREATE TABLE file (
    fhash CHAR(7) NOT NULL,
    fsize INTEGER NOT NULL,
    fname VARCHAR(256) NOT NULL,
    fname_orig VARCHAR(256) NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY(fhash),
    FOREIGN KEY(uploaded_by) REFERENCES user(username)
);


INSERT INTO user VALUES('toni', '$2y$10$fR3ZI9uTO5g0nV//QjCcQuMovLd36lH6nhMs/2yqgsrNLKWhj79um');
