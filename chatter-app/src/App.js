import React, { Component } from 'react';
// import axios from 'axios'
import { Route, Switch } from 'react-router-dom';
import './css/App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import ViewProfile from './pages/ViewProfile';
import withAuth from './components/withAuth';
import Navbar from './components/Navbar';
import Signup from './pages/Signup';

class App extends Component {

  render() {
    return (
      <div className="app" >
        <Navbar />
        <Switch>
          <Route exact path="/index.html" component={Home} />
          <Route exact path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/profile" component={withAuth(Profile)} />
          <Route path="/view-profile/:user_handle" component={withAuth(ViewProfile)} />
          <Route path="/profile-edit" component={withAuth(ProfileEdit)} />
        </Switch>
      </div>
    )
  }
}

export default App;
