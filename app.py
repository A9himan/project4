import random
import string
from datetime import datetime
from zoneinfo import ZoneInfo

from flask import Flask, render_template, request, session, redirect, url_for
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "change-this-secret-in-production"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

rooms = {}
MAX_HISTORY = 100
IST = ZoneInfo("Asia/Kolkata")


def generate_room_code():
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace("0", "").replace("O", "").replace("I", "").replace("1", "")
    while True:
        code = "".join(random.choice(chars) for _ in range(5))
        if code not in rooms:
            return code


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/create", methods=["POST"])
def create_room():
    username = request.form.get("username", "").strip()[:20] or "Anonymous"
    code = generate_room_code()
    rooms[code] = {"users": {}, "history": []}
    session["username"] = username
    return redirect(url_for("room", code=code))


@app.route("/join", methods=["POST"])
def join_room_route():
    username = request.form.get("username", "").strip()[:20] or "Anonymous"
    code = request.form.get("code", "").strip().upper()
    session["username"] = username
    return redirect(url_for("room", code=code))


@app.route("/room/<code>")
def room(code):
    code = code.upper()
    username = session.get("username", "Anonymous")
    room_exists = code in rooms
    return render_template(
        "room.html", code=code, username=username, room_exists=room_exists
    )


@socketio.on("join")
def on_join(data):
    code = data["room"].upper()
    username = data["username"]

    if code not in rooms:
        rooms[code] = {"users": {}, "history": []}

    join_room(code)
    rooms[code]["users"][request.sid] = username

    emit(
        "history",
        {"messages": rooms[code]["history"]},
        room=request.sid,
    )

    emit(
        "system",
        {"text": f"{username} tuned in.", "time": _now()},
        room=code,
    )

    emit(
        "user_list",
        {"users": list(rooms[code]["users"].values())},
        room=code,
    )


@socketio.on("send_message")
def on_send_message(data):
    code = data["room"].upper()
    username = data.get("username", "Anonymous")
    text = (data.get("text") or "").strip()[:2000]
    if not text or code not in rooms:
        return

    message = {"user": username, "text": text, "time": _now()}
    rooms[code]["history"].append(message)
    rooms[code]["history"] = rooms[code]["history"][-MAX_HISTORY:]

    emit("message", message, room=code)


@socketio.on("typing")
def on_typing(data):
    code = data["room"].upper()
    username = data.get("username", "Anonymous")
    emit("typing", {"username": username}, room=code, include_self=False)


@socketio.on("stop_typing")
def on_stop_typing(data):
    code = data["room"].upper()
    username = data.get("username", "Anonymous")
    emit("stop_typing", {"username": username}, room=code, include_self=False)


@socketio.on("disconnect")
def on_disconnect():
    for code, room_data in list(rooms.items()):
        if request.sid in room_data["users"]:
            username = room_data["users"].pop(request.sid)
            emit(
                "system",
                {"text": f"{username} went off the air.", "time": _now()},
                room=code,
            )
            emit(
                "user_list",
                {"users": list(room_data["users"].values())},
                room=code,
            )
            if not room_data["users"] and not room_data["history"]:
                rooms.pop(code, None)


def _now():
    return datetime.now(IST).strftime("%H:%M")


if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)