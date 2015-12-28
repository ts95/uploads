var Localize = require('localize');

var clientLocalize = new Localize({
    "No match": {
        "nb": "Intet funn",
    },
    "Logged in as $[1]": {
        "nb": "Logget inn som $[1]",
    },
    "Log in": {
        "nb": "Logg inn",
    },
    "Log out": {
        "nb": "Logg ut",
    },
    "Choose a file": {
        "nb": "Velg en fil",
    },
    "Username": {
        "nb": "Brukernavn",
    },
    "Password": {
        "nb": "Passord",
    },
    "$[1] complete": {
        "nb": "$[1] fullført",
    },
    "Name": {
        "nb": "Navn",
    },
    "Original name": {
        "nb": "Opprinnelig navn",
    },
    "Size": {
        "nb": "Størrelse",
    },
    "Time": {
        "nb": "Tid",
    },
    "Delete": {
        "nb": "Slett",
    },
});

var serverLocalize = new Localize({
    "This user does not exist": {
        "nb": "Denne brukeren finnes ikke",
    },
    "File successfully deleted": {
        "nb": "Filsletting vellykket",
    },
    "You are not the owner of this file": {
        "nb": "Du er ikke eieren av denne filen",
    },
    "Invalid credentials": {
        "nb": "Ugyldige innloggingsopplysninger",
    },
    "Not logged in": {
        "nb": "Ikke innlogget",
    },
    "Logged out": {
        "nb": "Logget ut",
    },
});

module.exports.supported = ['nb', 'en'];
module.exports.client = clientLocalize;
module.exports.server = serverLocalize;
