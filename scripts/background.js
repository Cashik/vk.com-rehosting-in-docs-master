/*global*/
var debug = true,
    client_secret_key = 'SPkHM3o3nkVqp2Fo9zp2',
    vkCLientId = '5886692',
    vkRequestedScopes = 'docs,offline,messages,wall',
    vk_default_redirect_uri = 'https://oauth.vk.com/blank.html',
    client_access_token = 'b0878ea6b0878ea6b0ea7097d3b0de5c42bb087b0878ea6e82cfc3cefc7b30a5429719c';

function log(msg) {
    if (debug)
        console.log(msg);
}
chrome.extension.onConnect.addListener(function (port) {
    log("Connected .....");
    port.onMessage.addListener(function (msg) {
        log("message recieved " + msg);
        chrome.storage.local.get([
            'vkaccess_token',
            'vk_user_id'
        ], function (items) {
            log("12"+getFriends(items.vk_user_id,"photo_50",items.vkaccess_token)); port.postMessage(getFriends(items.vk_user_id,"photo_50",items.vkaccess_token));
        });
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

function sendMessageToFriend(message, user_id, vkaccess_token) {
    var xhr = new XMLHttpRequest();
    var req = createVkApiRequest('messages.send', {
        user_id: user_id,
        message: message,
        access_token: vkaccess_token,
        //v: '5.62'
    });
    log(req);
    xhr.open('GET', req, true);
    xhr.send();
}

function getFriends(user_id, fields, vkaccess_token) {
    var xhr = new XMLHttpRequest();
    var req = createVkApiRequest('friends.get', {
        user_id: user_id,
        fields: fields,
        order: "hints",
        access_token: vkaccess_token,
        v: '5.62'
    });
    //chrome.tabs.create({url:req,selected:true});
    xhr.open('GET', req, false);
    xhr.send(null);
    log(xhr.responseText);
    return JSON.parse(xhr.responseText);
}

function listenerHandler(authenticationTabId, imageSourceUrl) {
    "use strict";

    return function tabUpdateListener(tabId, changeInfo) {
        var vkAccessToken,
            user_id,
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

                chrome.storage.local.set({
                    'vkaccess_token': vkAccessToken,
                    'vk_user_id': user_id
                }, function () {
                    chrome.windows.getLastFocused(null, function (wnd) {
                        chrome.tabs.getSelected(wnd.id, function (tab) {
                            chrome.tabs.remove(tab.id, function () {
                                log("delete!))");
                            });
                        });
                    });

                });
            }
        }
    };
}

/**
 * Handle main functionality of 'onlick' chrome context menu item method
 */
function getClickHandler() {
    "use strict";

    return function (info, tab) {



        chrome.storage.local.get([
            'vkaccess_token',
            'vk_user_id'
        ], function (items) {

            var imageSourceUrl = info.srcUrl,
                vkAuthenticationUrl = createRequest('https://oauth.vk.com/authorize', {
                    client_id: vkCLientId,
                    scope: vkRequestedScopes,
                    redirect_uri: vk_default_redirect_uri,
                    display: 'popup',
                    response_type: 'token'
                }),
                token_valid = true,
                tokencheck = new XMLHttpRequest(),
                req = createVkApiRequest('secure.checkToken', {
                    client_secret: client_secret_key,
                    access_token: client_access_token,
                    token: items.vkaccess_token,
                    v: '5.62'
                });
            log(req);

            tokencheck.open('GET', req, true);
            tokencheck.onreadystatechange = function () {
                if (tokencheck.readyState == 4) {
                    if (tokencheck.status == 200) {
                        if (JSON.parse(tokencheck.response).error) {
                            token_valid = false;
                            // Удаляем текущий токен, если он недействительный 
                            chrome.storage.local.remove('vkaccess_token');
                            chrome.storage.local.remove('vk_user_id');
                        }

                    }
                }
            };
            tokencheck.send();

            // если токен не существует или недействителен, то заново авторизируемся
            if (!items.vkaccess_token || !token_valid || !items.vk_user_id) {
                chrome.windows.create({
                    url: vkAuthenticationUrl,
                    focused: true,
                    width: 700,
                    height: 500

                }, function (wnd) {
                    log("wnd=" + wnd);
                    chrome.tabs.getSelected(wnd.id, function (tab) {
                        log("tab=" + tab.id);
                        chrome.tabs.onUpdated.addListener(listenerHandler(tab.id, imageSourceUrl));
                    });
                });

                return;
            }

            //
            sendMessageToFriend(info.srcUrl, items.vk_user_id, items.vkaccess_token);
        });
    };
}




// Create a parent item and two children.
var parent = chrome.contextMenus.create({
    "title": "Share to VK",
    "contexts": ["image", "video", "audio", "link", "page"]
});
var child1 = chrome.contextMenus.create({
    "title": "Братишке",
    "parentId": parent,
    "onclick": getClickHandler(),
    "contexts": ["image", "video", "audio", "link", "page"]
});
var child2 = chrome.contextMenus.create({
    "title": "В группу",
    "parentId": parent,
    "onclick": getClickHandler()
});
log("parent:" + parent + " child1:" + child1 + " child2:" + child2);