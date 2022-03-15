const postReply = (req, res) => {
    console.log(req.body)
    const db = req.app.get('db')
    const user_id = req.session.profile.user_id;
    const body = req.body.body;
    const created_at = req.body.created_at;
    const comment_id = req.body.comment_id;

    db.query(`
    INSERT INTO replies (
        user_id,
        body,
        created_at,
        comment_id
    )
    VALUES (
        \${user_id},
        \${body},
        \${created_at},
        \${comment_id}
    )
    `,
        {
            user_id,
            body,
            created_at,
            comment_id
        }
    )
        .then(data => {
            res.send(console.log('Entered'))
        })
        .catch(error => {
            console.log(error)
        })
}

const increaseReplyCount = (req, res) => {
    const db = req.app.get('db')
    const comment_id = parseInt(req.params.comment_id)
    db.query(
        `UPDATE comments
        SET replies_count = replies_count + 1
        WHERE comment_id = \${comment_id}`,
        {
            comment_id
        }
    )
        .then((data) => {
            res.send(data)
        })
        .catch(console.error)
}

module.exports = {
    postReply,
    increaseReplyCount
}