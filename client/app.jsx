var React                   = require('react');
var ReactDOM                = require('react-dom');
var Router                  = require('react-router').Router;
var Route                   = require('react-router').Route;
var Link                    = require('react-router').Link;
var formurlencoded          = require('form-urlencoded');
var prettyBytes             = require('pretty-bytes');
var moment                  = require('moment');

var localize                = require('../localization/localize').client;

var createBrowserHistory    = require('history/lib/createBrowserHistory');

require('moment/locale/nb');

var lang = window.navigator.userLanguage || window.navigator.language;
moment.locale(lang);
localize.setLocale(lang);

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
                {this.state.auth ? <UploadForm/> : null}
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
                    alert(result.error);
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
                <input ref="username" type="text" placeholder={localize.translate('Username')}/>
                <input ref="password" type="password" placeholder={localize.translate('Password')}/>
                <input ref="login" type="submit" value={localize.translate('Log in')}/>
            </form>
        );
    },
    renderLoggedIn: function() {
        return (
            <div>
                <span>{localize.translate('Logged in as $[1]', this.state.auth.username)}</span>
                <button onClick={this.logoutHandler}>{localize.translate('Log out')}</button>
            </div>
        );
    },
    render: function() {
        return <div className="login-form">{ this.state.auth ? this.renderLoggedIn() : this.renderForm() }</div>;
    }
});

var UploadForm = React.createClass({
    getInitialState: function() {
        return { link: null, progress: 0 };
    },
    uploadHandler: function() {
        var _this = this;

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
                    _this.setState({ link: url });
                } else {
                    alert(result.error);
                    console.error(result.error);
                }
            }
        };
        req.upload.addEventListener('progress', function(e) {
            _this.setState({ progress: (e.loaded / e.total) * 100 }); 
        });
        req.open('POST', '/api/upload', true);
        req.send(formData);
    },
    fileChangeHandler: function(e) {
        var file = ReactDOM.findDOMNode(this.refs.file).files[0];
        ReactDOM.findDOMNode(this.refs.fileLabel).innerText = file.name;

        this.uploadHandler();
    },
    chooseFileHandler: function(e) {
        var fileElem = ReactDOM.findDOMNode(this.refs.file);
        fileElem.click();
    },
    renderResult: function(link) {
        return (
            <div><a href={link} target="_blank">{link}</a></div>
        );
    },
    renderProgress: function(percentage) {
        var roundedPercentage = Math.ceil(percentage);
        return (
            <div>{roundedPercentage ? localize.translate('$[1] complete', roundedPercentage + '%') : null}</div>
        );
    },
    render: function() {
        return (
            <div>
                <form ref="form" className="upload-form" onSubmit={this.uploadHandler}>
                    <input ref="file" name="file" type="file" onChange={this.fileChangeHandler}/>
                    <label htmlFor="file" ref="fileLabel" onClick={this.chooseFileHandler}>▲ {localize.translate('Choose a file')}</label>
                </form>
                {this.renderProgress(this.state.progress)}
                {this.state.link ? this.renderResult(this.state.link) : null}
            </div>
        );
    }
});

var History = React.createClass({
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
                {this.state.auth ? <UploadTable count={500}/> : null}
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
        req.open('GET', '/api/history/' + (this.props.count || 100), true);
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
                <td><a href={'/!/' + upload.fname} target="_blank">{upload.fname}</a></td>
                <td>{upload.fname_orig}</td>
                <td>{prettyBytes(upload.fsize)}</td>
                <td><time dateTime={upload.uploaded_at}>{moment(upload.uploaded_at).format('lll')}</time></td>
                <td><button onClick={this.deleteHandler.bind(this, upload.fhash)}>{localize.translate('Delete')}</button></td>
            </tr>
        );
    },
    renderTable: function() {
        var renderItem = this.renderItem;
        return (
            <table className="upload-table">
                <thead>
                    <tr>
                        <th>{localize.translate('Name')}</th>
                        <th>{localize.translate('Original name')}</th>
                        <th>{localize.translate('Size')}</th>
                        <th>{localize.translate('Time')}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {this.state.uploads.map(function(upload) {
                        return renderItem(upload);
                    })}
                </tbody>
            </table>
        );
    },
    render: function() {
        return (
            <div>{this.state.uploads.length > 0 ? this.renderTable() : null}</div>
        );
    }
});

var NoMatch = React.createClass({
    render: function() {
        return <h1>{localize.translate('No match')}</h1>;
    }
});

ReactDOM.render((
    <Router history={createBrowserHistory()}>
        <Route path="/" component={App}/>
        <Route path="/history" component={History}/>
        <Route path="*" component={NoMatch}/>
    </Router>
), document.getElementById('app'));
