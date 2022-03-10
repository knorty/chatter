const bcrypt = require('bcryptjs')
// FIND a user by credentials
// function findUser(req, res, next) {
//   req.app
//     .get("db")
//     .findUserByCredentials([req.body.email, req.body.password])
//     .then(result => {
//       if (!result[0]) {
//         return res.status(404).send("Not Found");
//       }
//       res.status(201).json(result[0]);
//     });
// }
// CREATE a user
const createUser = async (req, res, next) => {
  try {
    const { user_handle, email, password } = req.body
    const hash = await bcrypt.hash(password, 10)
    await req.app
      .get("db")
      .createUser([
        user_handle,
        email,
        hash
      ])
    res.status(201).json("All good!");
  } catch (e) {
    console.log(e);
    res.status(500).send("Something went wrong!")
  }
};

module.exports = {
  createUser
};
