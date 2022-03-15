import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import ReplyComment from '../components/ReplyComment';
import axios from 'axios';
// import { FaMeteor } from 'react-icons/fa';
import { TiTrash } from 'react-icons/ti';
import '../css/CommentActions.css';
// var page_url;
// window.chrome.tabs.getSelected(null, function (tab) {
//     page_url = tab.url
// })
// const page_url = window.location.href;

class CommentActions extends Component {
    constructor(props) {
        super(props)
        this.state = {
            replyBox: false
        }
    }

    setReplyBox = () => {
        this.setState({ replyBox: !this.state.replyBox })
    }

    deleteComment = () => {
        axios({
            method: 'DELETE',
            url: `http://localhost:8080/comments/${this.props.comment_id}`,
            headers: {
                Authorization: localStorage.getItem('chatter token')
            }
        })
            .then((res) => console.log(res));
        this.props.history.go(0);
    }

    render() {
        return (
            <div className="comment-task-bar-container">
                {this.state.replyBox === false ?
                    <div className="comment-task-bar">
                        <button className="reply-btn" onClick={this.setReplyBox}><div className="text-subtle">Reply</div></button>
                        <button className="view-replies-btn"><div className="text-subtle">View Replies ({this.props.replies_count})</div></button>
                        <TiTrash title="destroy" size="17px" color="#E84855" onClick={this.deleteComment} />
                    </div> : <div className="reply-task-bar-container">
                        <ReplyComment comment_id={this.props.comment_id} setReplyBox={this.setReplyBox} />
                    </div>}
            </div>
        )
    }
}

export default withRouter(CommentActions);