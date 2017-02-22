var port = chrome.extension.connect({
    name: "Sample Communication"
});

port.postMessage("Hi BackGround");
port.onMessage.addListener(function (response) {

    var friends_list = document.getElementById("friends");
    var friend_shema = document.getElementById("friend_li_shema");

    response.response.items.forEach(function (friend) {
        var fname = document.createElement("p");
        var sname = document.createElement("p");
        fname.innerHTML = friend.first_name;
        sname.innerHTML = friend.last_name;

        var avatar = document.createElement("img");
        avatar.src = friend.photo_50;
        avatar.classList.add("img-circle");

        var d1 = document.createElement("div");
        var d2 = document.createElement("div");
        var d3 = document.createElement("div");
        d1.classList.add("col-xs-3");
        d2.classList.add("col-xs-6");
        d3.classList.add("col-xs-3");

        d1.appendChild(avatar);
        d2.appendChild(fname);
        d2.appendChild(sname);

        var friend_li = document.createElement("div");
        friend_li.classList.add("row");
        friend_li.appendChild(d1);
        friend_li.appendChild(d2);
        friend_li.appendChild(d3);

        friends_list.appendChild(friend_li);

    });
});