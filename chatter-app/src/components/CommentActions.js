import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import ReplyComment from './ReplyComment';
import Reply from './Reply';
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
            replies: null,
            replyBox: false,
            viewReplies: false
        }
    }

    setReplyBox = () => {
        this.setState({ replyBox: !this.state.replyBox })
    }

    setViewReplies = () => {
        this.setState({ viewReplies: !this.state.viewReplies })
    }

    getReplies = async () => {
        try {
            const { data: replies } = await axios.get(`http://localhost:8080/replies?comment_id=${this.props.comment_id}`)
            this.setState({ replies })
        } catch (error) {
            console.log('refresh', error)
        }
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

    componentDidMount() {
        this.getReplies()
    }

    render() {
        if (!this.state.replies) return <div>{'Loading...'}</div>
        const user_handle = localStorage.getItem('user_handle')
        console.log(user_handle)
        console.log(this.props.user_handle)
        const replies = this.state.replies.map((reply, i) => {
            return (<Reply
                key={i}
                reply_id={reply.reply_id}
                body={reply.body}
                created_at={reply.created_at}
                user_handle={reply.user_handle}
            />
            )
        }
        )
        let content;
        if (this.state.viewReplies) {
            content = <div>{replies}</div>
        } else {
            content = <div>
                {this.state.replyBox === false ?
                    <div className="comment-task-bar">
                        <button className="reply-btn" onClick={this.setReplyBox}><div className="text-subtle">Reply</div></button>
                        <button className="view-replies-btn" onClick={this.setViewReplies}><div className="text-subtle">View Replies ({this.props.replies_count})</div></button>
                        {this.props.user_handle === user_handle ? <div className="delete-comment-btn"><TiTrash title="destroy" size="17px" color="#E84855" onClick={this.deleteComment} /></div> : <div></div>}
                    </div> : <div className="reply-task-bar-container">
                        <ReplyComment comment_id={this.props.comment_id} setReplyBox={this.setReplyBox} />
                    </div>}
            </div>
        }
        return (
            <div className="comment-task-bar-container">
                {content}
            </div>
        )
    }
}

export default withRouter(CommentActions);