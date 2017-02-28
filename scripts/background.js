/*global*/
var debug = true,
    client_secret_key = 'SPkHM3o3nkVqp2Fo9zp2',
    vkCLientId = '5886692',
    vkRequestedScopes = 'docs,offline,messages,wall,photos',
    vk_default_redirect_uri = 'https://oauth.vk.com/blank.html',
    client_access_token = 'b0878ea6b0878ea6b0ea7097d3b0de5c42bb087b0878ea6e82cfc3cefc7b30a5429719c';

function log(msg) {
    if (debug)
        console.log(msg);
}
chrome.extension.onConnect.addListener(function (port) {
    log("Connected .....");
    port.onMessage.addListener(function (msg) {
        log("message recieved " + msg.message);
        //msg = JSON.parse(msg);
        switch (msg.message) {
        case "getFriends":
            {
                chrome.storage.local.get([
                    'users_dic',
                    'vk_user_id'
                ], function (items) {
                    if (items.vk_user_id!= undefined) {
                        log(items.vk_user_id);
                        log(items.users_dic);
                        getFriendsAsync(items.vk_user_id, "photo_50", items.users_dic[items.vk_user_id].vkaccess_token, function (friends) {
                            var mod_friends = friends.map(function (friend) {
                                items.users_dic[items.vk_user_id].sub_friends.forEach(function (sub_friend) {
                                    if (friend.id == sub_friend.user_id) {
                                        friend.checked = "checked";
                                    }
                                    //log(friend.user_id + sub_friend.user_id)
                                });
                                return friend;
                            });
                            msg = {
                                message: "returnFriends",
                                friends: mod_friends,
                            }
                            port.postMessage(msg);
                        });
                    }else{
                        msg = {
                                message: "returnFriends",
                                friends: {},
                            }
                            port.postMessage(msg);
                    }
                });

            }
            break;
        case "getAccounts":
            {
                chrome.storage.local.get([
                    'users_dic',
                    'vk_user_id'
                ], function (items) {

                    var accounts = [];
                    for (var key in items.users_dic) {
                        if (items.vk_user_id == key) {
                            items.users_dic[key].checked = "checked";
                        }
                        items.users_dic[key].id = key;
                        accounts.push(items.users_dic[key]);
                    }
                    var response = {
                        message: "returnAccounts",
                        accounts: accounts,
                    }
                    port.postMessage(response);
                });

            }
            break;
        case "ChangeFriend":
            {
                log(msg.user_id + "  " + msg.checked);
                chrome.storage.local.get([
                'users_dic',
                'vk_user_id'
                ], function (items) {
                    if (msg.checked == true) {
                        items.users_dic[items.vk_user_id].sub_friends.push({
                            'user_id': msg.user_id,
                            'user_full_name': msg.user_full_name
                        });
                    } else {

                        // remove user from subscribe friend list
                        items.users_dic[items.vk_user_id].sub_friends = items.users_dic[items.vk_user_id].sub_friends.filter(function (e) {
                            return JSON.stringify(e) !== JSON.stringify({
                                'user_full_name': msg.user_full_name,
                                'user_id': msg.user_id
                            });
                        });
                    }
                    chrome.storage.local.set({
                        'users_dic': items.users_dic,
                    }, function () {
                        log("Friend sub list changed to - " + items.users_dic[items.vk_user_id].sub_friends.toString());
                        UpdateContextMenu();
                    });

                });


            }
            break;
        case "SetCurrentUser":
            {
                log(msg.user_id + "  " + msg.checked);
                chrome.storage.local.set({
                    'vk_user_id': msg.user_id,
                }, function () {
                    log("Current user changed to - " + msg.user_id);
                    UpdateContextMenu();
                    var response = {
                        message: "userChange",
                    }
                    port.postMessage(response);
                });
            }
            break;
        case "refreshUser":
            {
                vkAuthorizationDialog(function () {
                    UpdateContextMenu();
                    var response = {
                        message: "userRefresh",
                    }
                    port.postMessage(response);

                });

            }
            break;
        case "deleteUser":
            {
                log(msg.user_id);
                chrome.storage.local.get(['users_dic', 'vk_user_id'],
                    function (result) {
                        delete result.users_dic[msg.user_id];
                        log(result.vk_user_id);
                        if (result.vk_user_id == msg.user_id) {
                            chrome.storage.local.remove('vk_user_id');
                        }
                    log(result);
                        chrome.storage.local.set({
                            'users_dic':result.users_dic
                        }, function () {
                                                    UpdateContextMenu();
                            var response = {
                                message: "userDelete",
                            }
                            port.postMessage(response);
                        });
                    });
            }
            break;
        }


    });
});

function displayeAnError(textToShow, errorToShow) {
    "use strict";

    console.log(textToShow + '\n' + errorToShow);
}


function getUrlParameterValue(url, parameterName) {
    "use strict";

    var urlParameters = url.substr(url.indexOf("#") + 1),
        parameterValue = "",
        index,
        temp;

    urlParameters = urlParameters.split("&");

    for (index = 0; index < urlParameters.length; index += 1) {
        temp = urlParameters[index].split("=");

        if (temp[0] === parameterName) {
            return temp[1];
        }
    }

    return parameterValue;
}

function createRequest(path, params) {
    let second_part = [];
    for (let d in params) {
        second_part.push(encodeURIComponent(d) + '=' + encodeURIComponent(params[d]));
    }
    return path + '?' + second_part.join('&');

}

function createVkApiRequest(method_name, params) {
    var first_part = 'https://api.vk.com/method/' + method_name;
    return createRequest(first_part, params);
}

function sendMessageToFriend(data, user_id, vkaccess_token) {
    var xhr = new XMLHttpRequest();
    var req = createVkApiRequest('messages.send', {
        user_id: user_id,
        message: data.message,
        access_token: vkaccess_token,
        attachment: data.attachment,
        //v: '5.62'
    });
    log(req);
    xhr.open('GET', req, true);
    xhr.send();
}

function getFriendsAsync(user_id, fields, vkaccess_token, func) {
    var xhr = new XMLHttpRequest();
    var req = createVkApiRequest('friends.get', {
        user_id: user_id,
        fields: fields,
        order: "hints",
        access_token: vkaccess_token,
        v: '5.62'
    });
    //chrome.tabs.create({url:req,selected:true});
    xhr.open('GET', req, true);
    xhr.onload = function () {
        func(JSON.parse(xhr.responseText).response.items);
    }
    xhr.send(null);
    //log(xhr.responseText);

    //return JSON.parse(xhr.responseText).response.items;
}


function vkAuthorizationDialog(after) {
    var vkAuthenticationUrl = createRequest('https://oauth.vk.com/authorize', {
        client_id: vkCLientId,
        scope: vkRequestedScopes,
        redirect_uri: vk_default_redirect_uri,
        display: 'popup',
        response_type: 'token'
    })

    chrome.windows.create({
        url: vkAuthenticationUrl,
        focused: true,
        width: 700,
        height: 500

    }, function (wnd) {
        //log("wnd=" + wnd);
        chrome.tabs.getSelected(wnd.id, function (tab) {
            //log("tab=" + tab.id);
            chrome.tabs.onUpdated.addListener(listenerHandler(tab.id, after));
        });
    });
}

function listenerHandler(authenticationTabId, after) {
    "use strict";

    return function tabUpdateListener(tabId, changeInfo) {
        var vkAccessToken,
            user_id,
            full_name,
            vkAccessTokenExpiredFlag;

        if (tabId === authenticationTabId && changeInfo.url !== undefined && changeInfo.status === "loading") {

            if (changeInfo.url.indexOf('oauth.vk.com/blank.html') > -1) {
                authenticationTabId = null;
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);

                vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');
                user_id = getUrlParameterValue(changeInfo.url, 'user_id');


                if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
                    displayeAnError('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
                    return;
                }

                vkAccessTokenExpiredFlag = Number(getUrlParameterValue(changeInfo.url, 'expires_in'));

                if (vkAccessTokenExpiredFlag !== 0) {
                    displayeAnError('vk auth response problem', 'vkAccessTokenExpiredFlag != 0' + vkAccessToken);
                    return;
                }

                var getUserProfile = new XMLHttpRequest(),
                    req = createVkApiRequest('account.getProfileInfo', {
                        access_token: vkAccessToken,
                        v: '5.62'
                    });
                log(req);

                getUserProfile.open('GET', req, true);
                getUserProfile.onload = function () {
                    if (getUserProfile.status == 200) {
                        if (JSON.parse(getUserProfile.response).error) {
                            log("User token is invalid! - " + getUserProfile.responseText)
                            vkAuthorizationDialog();

                        } else {
                            var userProfile = JSON.parse(this.response).response;

                            chrome.storage.local.get('users_dic', function (result) {
                                if (result.users_dic == undefined) {
                                    result.users_dic = {};

                                }

                                if (result.users_dic[user_id]) {
                                    result.users_dic[user_id] = {
                                        'vkaccess_token': vkAccessToken,
                                        'sub_friends': result.users_dic[user_id].sub_friends,
                                        'first_name': userProfile.first_name,
                                        'last_name': userProfile.last_name,
                                    }
                                } else {
                                    result.users_dic[user_id] = {
                                        'vkaccess_token': vkAccessToken,
                                        'sub_friends': [],
                                        'first_name': userProfile.first_name,
                                        'last_name': userProfile.last_name,
                                        //'photo_50': userProfile.photo_50
                                    };
                                }

                                log(result.users_dic[user_id]);
                                log("User name - " + userProfile.first_name + ' ' + userProfile.last_name);
                                chrome.storage.local.set({
                                    'users_dic': result.users_dic,
                                    'vk_user_id': user_id
                                }, function () {
                                    chrome.windows.getLastFocused(null, function (wnd) {
                                        chrome.tabs.getSelected(wnd.id, function (tab) {
                                            chrome.tabs.remove(tab.id, function () {
                                                if (after)
                                                    setTimeout(after, 0);
                                            });
                                        });
                                    });

                                });
                            });
                        }

                    }
                };
                getUserProfile.send();


            }
        }
    };
}

/**
 * Handle main functionality of 'onlick' chrome context menu item method
 */
function getClickHandler(usr) {
    "use strict";

    return function (info, tab) {

        chrome.storage.local.get([
            'users_dic',
            'vk_user_id'
        ], function (items) {

            // если токен не существует то заново авторизируемся
            if (!items.users_dic || !items.vk_user_id) {
                //log("Resoursce is undefind" + items.users_dic + items.vk_user_id)
                vkAuthorizationDialog();
                return;
            }
            if (!items.users_dic[items.vk_user_id].vkaccess_token) {
                //log("Resoursce is undefind" + items.users_dic + items.vk_user_id)
                vkAuthorizationDialog();
                return;
            }

            /*
            var tokencheck = new XMLHttpRequest(),
                req = createVkApiRequest('secure.checkToken', {
                    client_secret: client_secret_key,
                    access_token: client_access_token,
                    token: items.users_dic[items.vk_user_id].vkaccess_token,
                    v: '5.62'
                });
            log(req);

            tokencheck.open('GET', req, true);
            tokencheck.onreadystatechange = function () {
                if (tokencheck.readyState == 4) {
                    if (tokencheck.status == 200) {
                        if (JSON.parse(tokencheck.response).error) {
                            log("User token is invalid! - " + tokencheck.responseText)
                            vkAuthorizationDialog();
                            
                        }else{
                            
                            
                        }

                    }
                }
            };
            tokencheck.send();*/

            switch (info.mediaType) {
            case "image":
                {
                    var getImage = new XMLHttpRequest();
                    getImage.responseType = 'blob';
                    getImage.open('GET', info.srcUrl);

                    getImage.onload = function () {
                        if (getImage.status == 200) {

                            var tokencheck = new XMLHttpRequest(),
                                req = createVkApiRequest('photos.getMessagesUploadServer', {
                                    access_token: items.users_dic[items.vk_user_id].vkaccess_token,
                                    v: '5.62'
                                });
                            log(req);

                            tokencheck.open('GET', req, true);
                            tokencheck.onload = function () {
                                if (tokencheck.status == 200) {
                                    if (JSON.parse(tokencheck.response).error) {
                                        log("Error - " + JSON.parse(tokencheck.response).error);

                                    }
                                    log(tokencheck.responseText);
                                    var requestFormData = new FormData();
                                    log(info.srcUrl);
                                    requestFormData.append("photo", getImage.response, info.srcUrl);
                                    var sendPhoto = new XMLHttpRequest();
                                    sendPhoto.open('POST', JSON.parse(tokencheck.response).response.upload_url, true);
                                    sendPhoto.onload = function () {
                                        if (sendPhoto.status == 200) {
                                            if (JSON.parse(sendPhoto.response).error) {
                                                log(JSON.parse(sendPhoto.response).error)
                                            };
                                            //log(sendPhoto.response);
                                            var answer = JSON.parse(sendPhoto.response);

                                            var savePhoto = new XMLHttpRequest(),
                                                req = createVkApiRequest('photos.saveMessagesPhoto', {
                                                    access_token: items.users_dic[items.vk_user_id].vkaccess_token,
                                                    photo: answer.photo,
                                                    server: answer.server,
                                                    hash: answer.hash,
                                                    v: '5.62'
                                                });
                                            savePhoto.open('GET', req, true);
                                            savePhoto.onload = function () {
                                                if (sendPhoto.status == 200) {
                                                    //log(this.response);
                                                    var answer = JSON.parse(this.response).response[0];
                                                    sendMessageToFriend({
                                                        "message": "",
                                                        attachment: "photo" + answer.owner_id + "_" + answer.id
                                                    }, usr, items.users_dic[items.vk_user_id].vkaccess_token);
                                                }
                                            };
                                            savePhoto.send();



                                        }
                                    };
                                    sendPhoto.send(requestFormData);

                                }
                            };
                            tokencheck.send();

                        }
                    };

                    getImage.send();
                }
                break;
            case "video":
                {
                    sendMessageToFriend({
                        "message": info.srcUrl,
                        //attachment: ""
                    }, usr, items.users_dic[items.vk_user_id].vkaccess_token);
                }
            }
            // -----------------------




            //photos.saveMessagesPhoto.
            //log(usr);

        });
    };
}


function UpdateContextMenu() {

    chrome.contextMenus.removeAll(function () {
        // Create a parent item and two children.
        var parents = [chrome.contextMenus.create({
            "title": "Картинка/Видео",
            "contexts": ["image", "video"]
        }), chrome.contextMenus.create({
            "title": "Ссылка",
            "contexts": ["link"]
        }), child2 = chrome.contextMenus.create({
            "title": "Страница",
            "contexts": ["page"]
        })];

        chrome.storage.local.get([
                'users_dic',
                'vk_user_id'
                ], function (items) {
            try {
                log("id in context "+items.vk_user_id);
                //log(items.users_dic);
                //log(items.users_dic[items.vk_user_id]);
                parents.forEach(function (parent) {
                    chrome.contextMenus.create({
                        "title": "Сохранить к себе",
                        "parentId": parent,
                        "onclick": getClickHandler(items.vk_user_id),
                        "contexts": ["image", "video", "audio", "link", "page"]
                    });
                    items.users_dic[items.vk_user_id].sub_friends.forEach(function (friend) {
                        chrome.contextMenus.create({
                            "title": friend.user_full_name,
                            "parentId": parent,
                            "onclick": getClickHandler(friend.user_id),
                            "contexts": ["image", "video", "audio", "link", "page"]
                        });
                    })
                });

            } catch (err) {

                log(err.message);

            }
        });

    });

}

UpdateContextMenu();