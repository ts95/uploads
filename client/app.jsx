var React                   = require('react');
var ReactDOM                = require('react-dom');
var Router                  = require('react-router').Router;
var Route                   = require('react-router').Route;
var Link                    = require('react-router').Link;
var formurlencoded          = require('form-urlencoded');
var moment                  = require('moment');
var prettyBytes             = require('pretty-bytes');

var createBrowserHistory    = require('history/lib/createBrowserHistory');

moment.locale(window.navigator.userLanguage || window.navigator.language);

var App = React.createClass({
    getInitialState: function() {
        return { auth: null };
    },
    authChangeHandler: function(auth) {
        this.setState({ auth: auth });
    },
    render: function() {
        return (
            <div>
                <LoginForm onAuthChange={this.authChangeHandler}/>
                <UploadForm/>
            </div>
        );
    }
});

var LoginForm = React.createClass({
    getInitialState: function() {
        return { auth: null };
    },
    componentDidMount: function() {
        var _this = this;

        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var result = JSON.parse(req.responseText);
                _this.setState({ auth: result.success });
                if (_this.props.onAuthChange)
                    _this.props.onAuthChange(result.success);
            }
        };
        req.open('GET', '/api/auth', true);
        req.send();
    },
    loginHandler: function(e) {
        e.preventDefault();
        
        var _this = this;

        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var result = JSON.parse(req.responseText);
                if (result.success) {
                    _this.setState({ auth: result.success });
                    if (_this.props.onAuthChange)
                        _this.props.onAuthChange(result.success);
                } else {
                    console.error(result.error);
                }
            }
        };
        req.open('POST', '/api/login', true);
        req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.send(formurlencoded.encode({
            username: this.refs.username.value,
            password: this.refs.password.value,
        }));
    },
    logoutHandler: function() {
        var _this = this;

        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var result = JSON.parse(req.responseText);
                if (result.success) {
                    _this.setState({ auth: null });
                    _this.props.onAuthChange(null);
                } else {
                    console.error(result.error);
                }
            }
        };
        req.open('GET', '/api/logout', true);
        req.send();
    },
    renderForm: function() {
        return (
            <form onSubmit={this.loginHandler}>
                <input ref="username" type="text"/>
                <input ref="password" type="password"/>
                <input ref="login" type="submit" value="Log in"/>
            </form>
        );
    },
    renderLoggedIn: function() {
        return (
            <div>
                <span>Logged in as {this.state.auth.username}</span>
                <button onClick={this.logoutHandler}>Log out</button>
            </div>
        );
    },
    render: function() {
        return <div>{ this.state.auth ? this.renderLoggedIn() : this.renderForm() }</div>;
    }
});

var UploadForm = React.createClass({
    uploadHandler: function(e) {
        e.preventDefault();

        var files = ReactDOM.findDOMNode(this.refs.file).files;
        if (files.length === 0)
            return;

        var file = files[0];

        var formData = new FormData();
        formData.append('file', file);

        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var result = JSON.parse(req.responseText);
                if (result.success) {
                    var url = result.success;
                    window.location.replace(url);
                } else {
                    console.error(result.error);
                }
            }
        };
        req.open('POST', '/api/upload', true);
        req.send(formData);
    },
    render: function() {
        return (
            <form onSubmit={this.uploadHandler}>
                <input ref="file" type="file"/>
                <input ref="upload" type="submit" value="Upload"/>
            </form>
        );
    }
});

var History = React.createClass({
    render: function() {
        return (
            <div>
                <UploadTable/>
            </div>
        );
    }
});

var UploadTable = React.createClass({
    getInitialState: function() {
        return { uploads: [] };
    },
    refreshUploads: function() {
        var _this = this;

        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var result = JSON.parse(req.responseText);
                if (result.success) {
                    _this.setState({ uploads: result.success });
                } else {
                    console.error(result.error);
                }
            }
        };
        req.open('GET', '/api/history', true);
        req.send();
    },
    componentDidMount: function() {
        this.refreshUploads();
    },
    deleteHandler: function(fhash) {
        var refreshUploads = this.refreshUploads;

        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var result = JSON.parse(req.responseText);
                if (result.success) {
                    refreshUploads();
                } else {
                    console.error(result.error);
                }
            }
        };
        req.open('POST', '/api/delete', true);
        req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.send(formurlencoded.encode({
            fhash: fhash,
        }));
    },
    renderItem: function(upload) {
        return (
            <tr key={upload.fhash}>
                <td><a href={'/u/' + upload.fname} target="_blank">{upload.fname}</a></td>
                <td>{upload.fname_orig}</td>
                <td>{prettyBytes(upload.fsize)}</td>
                <td>{upload.uploaded_by}</td>
                <td>{moment(upload.uploaded_at).format('lll')}</td>
                <td><button onClick={this.deleteHandler.bind(this, upload.fhash)}>Delete</button></td>
            </tr>
        );
    },
    render: function() {
        var renderItem = this.renderItem;
        return (
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Original name</th>
                        <th>Size</th>
                        <th>Uploader</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {this.state.uploads.map(function(upload) {
                        return renderItem(upload);
                    })}
                </tbody>
            </table>
        );
    }
});

var NoMatch = React.createClass({
    render: function() {
        return <h1>No match</h1>;
    }
});

ReactDOM.render((
    <Router history={createBrowserHistory()}>
        <Route path="/" component={App}/>
        <Route path="/history" component={History}/>
        <Route path="*" component={NoMatch}/>
    </Router>
), document.getElementById('app'));
