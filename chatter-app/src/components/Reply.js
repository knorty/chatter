import React, { Component } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';
import '../css/Comment.css';
import { Link } from 'react-router-dom';

//POSSIBLY DELETE?
//import axios from 'axios';
//import CommentActions from '../components/CommentActions';
//import userIconSmall from '../svgs/user-icon-s.svg';

class Reply extends Component {

    render() {
        dayjs.extend(relativeTime)
        return (
            <div key={this.props.reply_id}>
                <div>
                    <div>
                        <div>
                            <Link className="commentor-username" to={`/view-profile/${this.props.user_handle}`}>{this.props.user_handle}</Link>
                        </div>
                        <div className="text-subtle-2">{dayjs(this.props.created_at).fromNow()}</div>
                        <div>
                            {this.props.body}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Reply;