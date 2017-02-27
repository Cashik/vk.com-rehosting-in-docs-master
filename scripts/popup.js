window.onload = function () {
    var port = chrome.extension.connect({
        name: "Sample Communication"
    });

    port.postMessage({
        message: "getFriends"
    });
    port.postMessage({
        message: "getAccounts"
    });
    port.onMessage.addListener(function (msg) {
        switch (msg.message) {
        case "returnFriends":
            {
                var friends_list = document.getElementById("friends");
                var friend_template = document.getElementById("friend_template");
                msg.friends.forEach(function (friend) {
                    var friend_li = Mustache.render(friend_template.innerHTML, friend);
                    friends_list.innerHTML += (friend_li);

                });
                //console.log(response);
                $(".check_friend").change(function (target) {
                    var full_name = this.value.split(' ').slice(0, 2).join(' '),
                        user_id = this.value.split(' ')[2];
                    var msg = {
                        message: "ChangeFriend",
                        user_full_name: full_name,
                        user_id: user_id,
                        checked: this.checked,

                    }

                    port.postMessage(msg);
                });
            }
            break;
        case "returnAccounts":
            {
                var accounts_list = document.getElementById("accounts");
                var account_template = document.getElementById("account_template");
                msg.accounts.forEach(function (account) {
                    var account_li = Mustache.render(account_template.innerHTML, account);
                    accounts_list.innerHTML += (account_li);

                });
                //console.log(response);
                $(".check_account").change(function (target) {
                    user_id = this.value;
                    var msg = {
                        message: "SetCurrentUser",
                        user_id: user_id,
                    }

                    port.postMessage(msg);
                });
            }
            break;

        }


    });
    $("#refresh_user").click(function () {
        port.postMessage({
            message: "refreshUser"
        });
    });
}