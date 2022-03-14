import React from 'react';
import Textarea from 'react-textarea-autosize';
import axios from 'axios';
import { withRouter } from 'react-router-dom';
import '../css/AddComment.css';
import addIconLarge from '../svgs/add-icon-large.svg';
import addIcon from '../svgs/add-icon.svg';
import closeIcon from '../svgs/close-icon.svg';
import { getPageUrl } from '../url';


class AddComment extends React.Component {
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
    const page_url = await getPageUrl();

    console.log('AddComments', page_url)

    const token = localStorage.getItem('chatter token')
    try {
      const res = await axios({
        method: 'POST',
        url: 'http://localhost:8080/post/comment',
        data: {
          page_url,
          body: this.state.commentText,
          created_at: new Date().toISOString(),
          likes_count: 0,
          dislikes_count: 0,
          replies_count: 0
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
      this.state.commentBox === false ?
        <button className="add-comment-btn" onClick={this.setCommentBox}>
          <img src={addIconLarge} alt="Add Icon" title="Add a Comment" />
        </button> :
        <div className="add-comment">
          <Textarea className="comment-textarea" value={this.state.commentText} onChange={this.setCommentText} placeholder="Type Comment Here"></Textarea>
          <div className="add-comment-options">
            <button className="close-btn" onClick={this.setCommentBox}>
              <img src={closeIcon} alt="Close Icon" />
            </button>
            <button className="post-comment-btn" onClick={this.createComment}>
              <img src={addIcon} alt="Add Icon" />
            </button>
          </div>
        </div>
    )
  }
}

export default withRouter(AddComment);