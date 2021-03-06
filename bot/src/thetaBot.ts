"use strict";

import PubNub = require('pubnub');
import * as appConfig from './config.json';
import ThetaApi from './utils/theta.api';
import BabbleAip from './utils/babble.api';
import BabbleCmd from './utils/commands';
import Games from './games';

export default class ThetaBot {
    pubnub: any = new PubNub({ subscribeKey: appConfig.subscribeKey });
    listener: any = {
        message: (m) => { this.messageHandler(m); },
        presence: function (p) {
            // handle presence
            var action = p.action; // Can be join, leave, state-change or timeout
            var channelName = p.channel; // The channel for which the message belongs
            var occupancy = p.occupancy; // No. of users connected with the channel
            var state = p.state; // User State
            var channelGroup = p.subscription; //  The channel group or wildcard subscription match (if exists)
            var publishTime = p.timestamp; // Publish timetoken
            var timetoken = p.timetoken; // Current timetoken
            var uuid = p.uuid; // UUIDs of users who are connected with the channel
            if (action != "interval" || action != "leave") {
                //console.log("presence",p);
            }
        },
        signal: function (s) {
            // handle signal
            console.log("signal", s);
            var channelName = s.channel; // The channel for which the signal belongs
            var channelGroup = s.subscription; // The channel group or wildcard subscription match (if exists)
            var pubTT = s.timetoken; // Publish timetoken
            var msg = s.message; // The Payload
            var publisher = s.publisher; //The Publisher
        },
        user: function (userEvent) {
            console.log("userEvent", userEvent);
            // for Objects, this will trigger when:
            // . user updated
            // . user deleted
        },
        space: function (spaceEvent) {
            console.log("space", spaceEvent);
            // for Objects, this will trigger when:
            // . space updated
            // . space deleted
        },
        membership: function (membershipEvent) {
            console.log("membership", membershipEvent);
            // for Objects, this will trigger when:
            // . user added to a space
            // . user removed from a space
            // . membership updated on a space
        },
        messageAction: function (ma) {
            console.log("messageAction", ma);
            // handle message action
            var channelName = ma.channel; // The channel for which the message belongs
            var publisher = ma.publisher; //The Publisher
            var event = ma.message.event; // message action added or removed
            var type = ma.message.data.type; // message action type
            var value = ma.message.data.value; // message action value
            var messageTimetoken = ma.message.data.messageTimetoken; // The timetoken of the original message
            var actionTimetoken = ma.message.data.actionTimetoken; //The timetoken of the message action
        },
        status: function (s) {
            //console.log("status",s);
            var affectedChannelGroups = s.affectedChannelGroups; // The channel groups affected in the operation, of type array.
            var affectedChannels = s.affectedChannels; // The channels affected in the operation, of type array.
            var category = s.category; //Returns PNConnectedCategory
            var operation = s.operation; //Returns PNSubscribeOperation
            var lastTimetoken = s.lastTimetoken; //The last timetoken used in the subscribe request, of type long.
            var currentTimetoken = s.currentTimetoken; //The current timetoken fetched in the subscribe response, which is going to be used in the next request, of type long.
            var subscribedChannels = s.subscribedChannels; //All the current subscribed channels, of type array.
        }
    };

    constructor() {
        console.log("thetabot running");
        setInterval(async () => {
            let hasInstalls = await this.checkInstalsLoop();
            this.init(hasInstalls);
        }, 30000);
    }

    async checkInstalsLoop() {
        let channels = [];
        let numberGames = [];
        appConfig.subscribers.splice(0, appConfig.subscribers.length);
        await ThetaApi.getInstalls(
            data => {
                data.forEach((item) => {
                    let activeNumberGame = (BabbleAip.getNumGameConfig(item.user_id) ? BabbleAip.getNumGameConfig(item.user_id) : {
                        channelId: item.user_id,
                        active: false,
                        winningNumber: 0,
                        players: [],
                        lastGame: {
                            maxInt: 0
                        }
                    });
                    //TODO: REFACTER so that we can do better null checks
                    let channel: Channel = {
                        clientId: item.client_id,
                        userId: item.user_id,
                        accessToken: item.access_token,
                        prefix: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).prefix : appConfig.defaultPrefix),
                        botName: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).botName : 'Babble'),
                        alertConfig: {
                            all: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.all : true),
                            hello: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.hello : true),
                            donation: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.donation : true),
                            follow: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.follow : true),
                            gift: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.gift : true),
                            sub: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.sub : true),
                            giftedsub: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.giftedsub : true),
                            level: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.level : true),
                            quiz: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.quiz : false),
                            raffle: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.raffle : false),
                            rafflewin: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).alertConfig.rafflewin : true)
                        },
                        socialLinks: {
                            twitter: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.twitter : ""),
                            twitch: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.twitch : ""),
                            youtube: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.youtube : ""),
                            discord: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.discord : ""),
                            instagram: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.instagram : ""),
                            facebook: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.facebook : ""),
                            snapchat: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.snapchat : ""),
                            tiktok: (BabbleAip.getChannelConfig(item.user_id) ? BabbleAip.getChannelConfig(item.user_id).socialLinks.tiktok : "")
                        },
                        bridgeConfig: ((BabbleAip.getChannelConfig(item.user_id) && BabbleAip.getChannelConfig(item.user_id).bridgeConfig != undefined) ? BabbleAip.getChannelConfig(item.user_id).bridgeConfig : {
                            thetaConfig:{
                                active: false,
                                channelId: item.user_id
                            },
                            twitchConfig:{
                                active: false,
                                channelId: ""
                            }
                        }),
                        customCmds: ((BabbleAip.getChannelConfig(item.user_id) && BabbleAip.getChannelConfig(item.user_id).customCmds != undefined) ? BabbleAip.getChannelConfig(item.user_id).customCmds : [])
                    };
                    channels.push(channel);
                    numberGames.push(activeNumberGame);
                    appConfig.subscribers.push("chat." + item.user_id);
                });
            }
        );
        BabbleAip.updateChannelsDB(channels);
        BabbleAip.updateNumGameDB(numberGames);
        return true
    }

    init(hasInstalls: boolean) {
        if (hasInstalls) {
            this.startPubNub();
        }
    }

    startPubNub() {
        this.pubnub.removeListener(this.listener);
        this.pubnub.unsubscribe({ channels: appConfig.subscribers });
        this.pubnub.subscribe({
            channels: appConfig.subscribers,
            withPresence: true
        });
        this.pubnub.addListener(this.listener);
    }

    messageHandler(msgObject) {
        let channelId = msgObject.channel.replace('chat.', ''); // The channel for which the message belongs
        let pubTT = msgObject.timetoken; // Publish timetoken
        let msg = msgObject.message; // The Payload
        let publisher = msgObject.publisher; //The Publisher
        let msgText = msg.data.text;
        let msgType = msg.type;
        let user = msg.data.user;
        let channelConfig = BabbleAip.getChannelConfig(channelId);
        let ngChannelConfig = BabbleAip.getNumGameConfig(channelId);
        let onlyNumRegx = /^\d+$/;
        //if(channelId == "usrxhgay62cewzpiymn") {
           console.log(msgObject);
        //}
        switch (true) {
            case msgType.includes("chat_message"):
                if (msgText) {
                    if (ngChannelConfig.active && onlyNumRegx.test(msgText)) {
                        Games.numGameManager(msgText, user, channelId);
                    }
                    if ((msgText.startsWith(channelConfig.prefix) || msgText.startsWith('/')) && user.type == "user") {
                        BabbleCmd.checkViewHooks(msgText, user, channelId);
                    }
                    if (msgText.startsWith(channelConfig.prefix) && user.type != "user") {
                        if (user.type == "owner" || user.type == "moderator") {
                            BabbleCmd.runCmd(msgText, user, channelId);
                        } else {
                            ThetaApi.sendMsg("Sorry but you do not have Permission to do that", channelId);
                        }
                    }
                }
                break;
            default:
                if (channelConfig.alertConfig.all) {
                    BabbleCmd.statusHandler(msg, channelId);
                }
                break;
        }
    }
}
