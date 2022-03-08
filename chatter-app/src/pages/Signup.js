import React, { Component } from 'react';
import '../css/Signup.css';
import axios from 'axios';

class Signup extends Component {
    state = {
        user_handle: '',
        email: '',
        password: '',
        confirm_password: ''
    }

    handleInput = (e) => {
        this.setState({
            [e.target.name]: e.target.value
        })
    }

    login = () => {
        const body = {
            email: this.state.email,
            password: this.state.password
        }
        axios.post('http://localhost:8080/users/authenticate', body)
            .then(res => {
                if (res.status === 200) {
                    localStorage.setItem('chatter token', res.data)
                    this.props.history.push('/');
                } else {
                    const error = new Error(res.error);
                    throw error;
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error logging in please try again');
            })
        this.props.history.push('/');
    }

    onSubmit = () => {
        const credentials = {
            user_handle: this.state.user_handle,
            email: this.state.email,
            password: this.state.password
        }

        axios.post('http://localhost:8080/createuser', credentials)
            .then(this.login())
    }

    render() {
        return (
            <div className="signup-container">
                <input className="username-signup-input" name="user_handle" value={this.state.user_handle} placeholder="user handle" onChange={this.handleInput} />
                <input className="signup-email-input" name="email" value={this.state.email} placeholder="email" onChange={this.handleInput} />
                <input className="password-signup-input" type="password" name="password" value={this.state.password} placeholder="password" onChange={this.handleInput} />
                <input className="confirm-password-input" type="password" name="confirm_password" value={this.state.confirm_password} placeholder="confirm password" onChange={this.handleInput} />
                <div className="signup-btn-container" ></div>
                <button className="signup-btn" onClick={this.onSubmit}>Signup</button>
            </div>
        )
    };
}

export default Signup;