window.onload = function () {

    var port = chrome.extension.connect({
        name: "Sample Communication"
    });
    
    /*port.onMessage.addListener(function (msg) {
        switch (msg.message) {
            case "someMessage1":{
                // . . . some action
            } break;
            case "someMessage2":{
                // . . . some action
            } break;
            // . . . and so on
        }
    });*/
    
    port.onMessage.addListener(function (msg) {
        switch (msg.message) {
        case "returnFriends":
            {
                var friends_list = document.getElementById("friends");
                var friend_template = document.getElementById("friend_template");
                friends_list.innerHTML = "";

                var friendAdd = function (target, template, friend) {
                    var friend_li = Mustache.render(template.innerHTML, friend);
                    target.innerHTML += (friend_li);
                };
                msg.friends.forEach(function (friend, i) {
                    friendAdd(friends_list, friend_template, friend);
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
                accounts_list.innerHTML = "";
                msg.accounts.forEach(function (account) {
                    var account_li = Mustache.render(account_template.innerHTML, account);
                    accounts_list.innerHTML += (account_li);

                });
                getFriends();
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
        case "userDelete":
        case "userRefresh":
        case "userChange":
            {
                getAccounts();
            }
            break;


        }


    });


    var getAccounts = function () {
        port.postMessage({
            message: "getAccounts"
        });
    }

    var getFriends = function () {
        port.postMessage({
            message: "getFriends"
        });
    }
    getAccounts();

    $("body").on("click", ".delete_account", function (target) {
        user_id = this.value;
        port.postMessage({
            message: "deleteUser",
            user_id: user_id
        });
    });
    $("#refresh_user").click(function () {
        port.postMessage({
            message: "refreshUser"
        });
    });

}