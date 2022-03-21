import React, { Component } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';
import '../css/Comment.css';
import FireAndIce from './FireAndIce';
import { Link } from 'react-router-dom';
import CommentActions from './CommentActions';

//POSSIBLY DELETE?
//import axios from 'axios';
//import CommentActions from '../components/CommentActions';
//import userIconSmall from '../svgs/user-icon-s.svg';

class Comment extends Component {

  render() {
    dayjs.extend(relativeTime)
    return (
      <div className="comment" key={this.props.comment_id}>
        <div className="comment-side-bar">
          {/* <img className="user-icon-small" src={userIconSmall} alt="User Icon Small" /> */}
          <FireAndIce
            comment_id={this.props.comment_id}
          />
        </div>
        <div className="comment-content">
          <div>
            <div>
              <Link className="commentor-username" to={`/view-profile/${this.props.user_handle}`}>{this.props.user_handle}</Link>
            </div>
            <div className="text-subtle-2">{dayjs(this.props.created_at).fromNow()}</div>
            <div className="comment-text">
              {this.props.body}
            </div>
          </div>
          <div className="delete-comment">
            <CommentActions comment_id={this.props.comment_id} replies_count={this.props.replies_count} user_handle={this.props.user_handle} />
          </div>
        </div>
      </div>
    )
  }
}

export default Comment;