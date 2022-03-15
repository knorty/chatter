import React from 'react';
import Textarea from 'react-textarea-autosize';
import axios from 'axios';
import { withRouter } from 'react-router-dom';
import addIcon from '../svgs/add-icon.svg';
import closeIcon from '../svgs/close-icon.svg';
import '../css/ReplyComment.css';


class ReplyComment extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            replyText: "",
        }
    }

    setReplyText = (e) => {
        this.setState({
            replyText: e.target.value
        })
    }

    setReplyBox = () => {
        this.props.setReplyBox()
    }

    createReply = async () => {
        const token = localStorage.getItem('chatter token')
        try {
            const res = await axios({
                method: 'POST',
                url: 'http://localhost:8080/post/reply',
                data: {
                    body: this.state.replyText,
                    created_at: new Date().toISOString(),
                    comment_id: this.props.comment_id
                },
                headers: {
                    Authorization: token
                }
            })
            if (res.status === 200) {
                this.setState({
                    replyText: "",
                })
                this.props.history.go(0);
            } else {
                const error = new Error(res.error);
                throw error;
            }
            this.increaseReplyCount()
        } catch (err) {
            console.error(err);
            alert(`Please Login Before Posting A Reply + ${err}`);
            this.props.history.push('/login');
        }
    }

    increaseReplyCount = async () => {
        try {
            axios({
                method: 'PUT',
                url: `http://localhost:8080/increase_reply_count/${this.props.comment_id}`,
                headers: {
                    Authorization: localStorage.getItem('chatter token')
                }
            })
                .then(res => console.log(res.data))
        } catch (err) {
            console.error(err);
            alert({ err });
        }

    }
    render() {
        return (
            <div className="reply-comment" >
                <Textarea className="reply-textarea" value={this.state.replyText} onChange={this.setReplyText} placeholder="Type Reply Here"></Textarea>
                <div className="add-reply-options">
                    <button className="post-reply-btn" onClick={this.createReply}>
                        <img src={addIcon} alt="Add Icon" />
                    </button>
                    <button className="close-btn" onClick={this.setReplyBox}>
                        <img src={closeIcon} alt="Close Icon" />
                    </button>
                </div>
            </div>
        )
    }
}

export default withRouter(ReplyComment);
