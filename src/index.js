const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const userSession = users.find((user) => user.username === username);

  if (!userSession) {
    return response
      .status(404)
      .json({ error: "User not found by username in checksExistsUserAccount" });
  }

  request.user = userSession;

  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;
  // ver quantas todos o usuário já tem criadas
  const todosQuantity = user.todos.length;

  const userPlan = user.pro; // plano do usuário

  if (userPlan == false && todosQuantity >= 10) {
    return response
      .status(403)
      .json({ error: "Apenas usuários PRO podem criar mais de 10 todos." });
  }

  return next();
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  // id do todo
  const { id } = request.params;

  // user validade
  const userSession = users.find((user) => user.username === username);
  if (!userSession) {
    return response
      .status(404)
      .json({ error: "User not found by username in ckecksTodoExists!" });
  }

  // id validate
  idValidate = validate(id, 4);
  console.log(idValidate);

  if (!idValidate) {
    return response.status(400).json({ error: "O ID é inválido" });
  }

  // validar que o id pertence a um todo do usuário informado
  const todoRequired = userSession.todos.find((todo) => todo.id === id);
  if (!todoRequired) {
    return response
      .status(404)
      .json({ error: "Esse todo não pertence à esse usuário, ou não existe" });
  }

  request.user = userSession;
  request.todo = todoRequired;

  return next();
}

function findUserById(request, response, next) {
  const { id } = request.params;

  const userSession = users.find((user) => user.id === id);

  if (!userSession) {
    return response.status(404).json({ error: "User not found by id" });
  }

  request.user = userSession;

  return next();
}

app.post("/users", (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get("/users/:id", findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch("/users/:id/pro", findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return response.json(user);
});

app.get("/todos", checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return response.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
