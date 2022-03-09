import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import ReplyComment from '../components/ReplyComment';
import axios from 'axios';
import addIcon from '../svgs/add-icon.svg';
// import { FaMeteor } from 'react-icons/fa';
import { TiTrash } from 'react-icons/ti';
import '../css/CommentActions.css';
// var page_url;
// window.chrome.tabs.getSelected(null, function (tab) {
//     page_url = tab.url
// })
// const page_url = window.location.href;

class CommentActions extends Component {
    state = {
        reply: false
    }

    setReply = () => {
        this.setState({ reply: !this.state.reply })
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
                {this.state.reply === false ?
                    <div className="comment-task-bar">
                        <button className="reply-btn" onClick={() => this.setReply()}><div className="text-subtle">Reply</div></button>
                        <button className="view-replies-btn"><div className="text-subtle">View Replies (0)</div></button>
                        <TiTrash title="destroy" size="17px" color="#E84855" onClick={this.deleteComment} />
                    </div> : <div className="reply-task-bar-container">
                        {/* Need to add comment replies component */}
                        <ReplyComment />
                        <div className="add-reply-options">
                            <button className="post-reply-btn">
                                <img src={addIcon} alt="Add Icon" />
                            </button>
                        </div>
                    </div>}
            </div>
        )
    }
}

export default withRouter(CommentActions);