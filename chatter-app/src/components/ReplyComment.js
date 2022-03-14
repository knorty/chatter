import React from 'react';
import Textarea from 'react-textarea-autosize';
import axios from 'axios';
import addIcon from '../svgs/add-icon.svg';
import '../css/ReplyComment.css';


class ReplyComment extends React.Component {
    state = {
        commentBox: false,
        commentText: "",
    }

    setCommentBox = () => {
        this.setState({
            commentBox: !this.state.commentBox
        })
    }

    setCommentText = (e) => {
        this.setState({
            commentText: e.target.value
        })
    }

    createComment = async () => {
        const token = localStorage.getItem('chatter token')
        try {
            const res = await axios({
                method: 'POST',
                url: 'http://localhost:8080/post/comment',
                data: {
                    body: this.state.commentText,
                    created_at: new Date().toISOString(),
                },
                headers: {
                    Authorization: token
                }
            })
            if (res.status === 200) {
                this.setState({
                    commentBox: false,
                    commentText: "",
                })
                this.props.history.go(0);
            } else {
                const error = new Error(res.error);
                throw error;
            }
        } catch (err) {
            console.error(err);
            alert('Please Login Before Posting A Comment');
            this.props.history.push('/login');
        }
    }
    render() {
        return (
            <div className="reply-comment" >
                <Textarea className="reply-textarea" placeholder="Type Comment Here"></Textarea>
                <div className="add-reply-options">
                    <button className="post-reply-btn">
                        <img src={addIcon} alt="Add Icon" />
                    </button>
                </div>
            </div>
        )
    }
}

export default ReplyComment;

// this.state.commentBox === false ?
//     <button className="add-comment-btn" onClick={this.setCommentBox}>
//         <img src={addIconLarge} alt="Add Icon" title="Add a Comment" />
//     </button> :
//     <div className="add-comment">
//         <Textarea className="comment-textarea" value={this.state.commentText} onChange={this.setCommentText} placeholder="Type Comment Here"></Textarea>
//         <div className="add-comment-options">
//             <button className="close-btn" onClick={this.setCommentBox}>
//                 <img src={closeIcon} alt="Close Icon" />
//             </button>
//             <button className="post-comment-btn" onClick={this.createComment}>
//                 <img src={addIcon} alt="Add Icon" />
//             </button>
//         </div>
//     </div>
