const fs = require('fs')
const request = require('request');
const axios = require("axios");
// 创建数据库的连接
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017";
// 开心： happy
// 推荐：
var arguments = process.argv.splice(2);
const tabIndex = arguments[0];
if(!tabIndex) {
    console.log('----                                      ----')
    console.log('-----                                    -----')
    console.log('-------                                -------')
    console.log('-----------                        -----------')
    console.log('--------------                  --------------')
    console.error('-------------请输入需要下载的TAB-------------')
    console.log('--------------                  --------------')
    console.log('-----------                        -----------')
    console.log('-------                                -------')
    console.log('-----                                    -----')
    console.log('----                                      ----')
    
    return false
}
let topicTab;
async function insertData (client, callback) {
    client.db('test').collection('xiaoniangao', { safe: true }, async function(err, conn) {
        if (err){
            console.log(err)
        } else {
            const res = await getUserTab();
            if (res) {
                getVideoUrl(conn, callback);
            } else {
                client.close()
            }
            // write2excel(conn);
        }
    })
}
let dbClient = null;

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, client) {
    if (err) {
        console.log('databse connect fail\n')
        console.log(err) 
        throw err;
    }
    dbClient = client;
    insertData(client, function(conn) {
        if (topicTab.name !== 'nice') {
            write2excel(conn);
        } else {
            getProfileSrc(function () {
                write2excel(conn);
            })
        }
    });
});
const option = {
    method: 'POST',
    headers: {
        'Host': 'kapi.xiaoniangao.cn',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'Connection': 'keep-alive',
        'uuid': '3d47d100-6532-4401-9cea-c86882167b62',
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.12(0x17000c2d) NetType/WIFI Language/zh_CN',
        'Referer': 'https://servicewechat.com/wxd7911e4c177690e4/393/page-frame.html',
        'Accept-Language': 'zh-cn'
    }
};
async function getUserTab () {
    const getUserTabOption = Object.assign({}, option, {
        url: 'https://api.xiaoniangao.cn/topic/get_user_topics',
        encoding:null,
        data: {
            "token":"a12b50a12b60b16274cacf6d50e3f2f9",
            "uid":"3d47d100-6532-4401-9cea-c86882167b62",
            "proj":"ma",
            "wx_ver":"7.0.12",
            "code_ver":"2.11.1",
            "log_common_params":{
                "e":[
                    {
                        "data":{
                            page: 'discoverIndexPage',
                            topic: 'recommend'
                        }
                    }
                ],
                "ext":{
                    "brand":"iPhone",
                    "device":"iPhone XS",
                    "os":"iOS 13.4.1",
                    "weixinver":"7.0.12",
                    "srcver":"2.11.0"
                }
            }
        }
    })
    let response = await axios(getUserTabOption)
    const { ret, data } = response.data;
    console.log(response.data)

    if (ret == 1) {
        const { list } = data;
        if (Array.isArray(list)) {
            topicTab = list.find((item, index) => tabIndex == index);
            if (!topicTab) {
                list.forEach((li, index) => {
                    console.log(`${index}: ${li.title}`)
                })
            } else {
                return true;
            }
        }
    } else {
        console.log(ret)
        console.log('get userTab error')
    }
}
let count = 0;
let profileCount = 0;
const today = new Date().toLocaleDateString();
const repeatMap = new Map()
const niceVideoMap = new Map()
let start_t = -1 
console.log(today)
function getVideoUrl (conn, callback) {
    const getVideoUrlFunc = async () => {
        try {
            const param = {
                "log_params":{
                    "page":`discover_${topicTab.name}`,
                    "common":{
                        "brand":"iPhone",
                        "device":"iPhone XS",
                        "os":"iOS 13.4.1",
                        "weixinver":"7.0.12",
                        "srcver":"2.11.0",
                        "net":"wifi"
                    }
                },
                "log_common_params":{
                    "e":[
                        {
                            "data":{
                                "topic": topicTab.name,
                                "page":"discoverIndexPage"
                            }
                        }
                    ],
                    "ext":{
                        "brand":"iPhone",
                        "device":"iPhone XS",
                        "os":"iOS 13.4.1",
                        "weixinver":"7.0.12",
                        "srcver":"2.11.0",
                        "net":"wifi"
                    }
                },
                "qs":"imageMogr2/gravity/center/rotate/$/thumbnail/!750x500r/crop/750x500/interlace/1/format/jpg",
                "h_qs":"imageMogr2/gravity/center/rotate/$/thumbnail/!80x80r/crop/80x80/interlace/1/format/jpg",
                "share_width":625,
                "share_height":500,
                "ext":{
                    "items":{}
                },
                "token":"a12b50a12b60b16274cacf6d50e3f2f9",
                "uid":"3d47d100-6532-4401-9cea-c86882167b62",
                "proj":"ma",
                "wx_ver":"7.0.12",
                "code_ver":"2.10.1",
            };
            if (topicTab.id) {
                param['topic_id'] = topicTab.id;
            }
            if (topicTab.tag_id) {
                param['tag_id'] = topicTab.tag_id;
            }
            const getVideoUrlOption = Object.assign({}, option, { 
                url: 'https://kapi.xiaoniangao.cn/trends/get_recommend_trends',
                data: param
            })
            
            const body = await axios(getVideoUrlOption);
            const { ret, data } = body.data;
            if (ret == 1) {
                const { list } = data;
                if (Array.isArray(list)) {
                    console.log('本次请求到的视频个数：', list.length)
                    const queryPromise = list.map(item => {
                        const src = item.v_url.trim();
                        return conn.findOne({ src });
                    })
                    Promise.all(queryPromise).then(res => {
                        res.forEach((re,index) => {
                            const item = list[index];
                            const src = item.v_url.trim();
                            if(!re && !repeatMap.get(src)) {
                                count++
                                repeatMap.set(src, {
                                    src,
                                    topic: topicTab.title,
                                    title: item.title,
                                    date: today
                                })
                            }
                        });
                        console.log('获取视频视频链接个数：---count', count);
                        if (count >= 100) {
                            callback(conn);
                            return;
                        } else {
                            setTimeout(() => {
                                getVideoUrlFunc();
                            }, 60000);
                        }
                    })
                } else {
                    throw new Error('get data error');
                }
            } else {
                throw new Error('get data error');
            }
        } catch (err) {
            console.log(err);
            callback(conn);
        }
    }
    const getNiceVideoUrlFunc = async () => {
        const niceVideoUrlOption = Object.assign({}, option, {
            url: 'https://api.xiaoniangao.cn/album/featured',
            data: {
                "qs":"imageMogr2/gravity/center/rotate/$/thumbnail/!224x166r/crop/224x166/interlace/1/format/jpg",
                "start_t":start_t,
                "limit":5,
                "quality_qs":"imageMogr2/gravity/center/rotate/$/thumbnail/!1005x669r/crop/1005x669/interlace/1/format/jpg",
                "token":"a12b50a12b60b16274cacf6d50e3f2f9",
                "uid":"3d47d100-6532-4401-9cea-c86882167b62",
                "proj":"ma",
                "wx_ver":"7.0.12",
                "code_ver":"2.13.2",
                "log_common_params":{
                    "e":[
                        {
                            "data":{
                                "topic":"nice",
                                "page":"discoverIndexPage"
                            }
                        }
                    ],
                    "ext":{
                        "brand":"iPhone",
                        "device":"iPhone XS",
                        "os":"iOS 13.4.1",
                        "weixinver":"7.0.12",
                        "srcver":"2.11.1",
                        "net":"wifi",
                        "scene":1001
                    }
                }
            }
        })
        const body = await axios(niceVideoUrlOption);
        const { ret, data } = body.data
        let videoList = []
        if (ret === 1) {
            const { list } = data
            start_t = list[list.length-1].dl_t - 15 * 60000
            list.forEach(video => {
                const { albums } = video;
                videoList = videoList.concat(albums)
            })
            const queryPromise = videoList.map(item => {
                const profileid = item.profile_id;
                return conn.findOne({ profileid });
            })
            Promise.all(queryPromise).then(res => {
                res.forEach((re,index) => {
                    const item = videoList[index];
                    const profileid = item.profile_id;
                    if(!re && !niceVideoMap.get(profileid)) {
                        count++
                        niceVideoMap.set(profileid, {
                            src: '',
                            profileid,
                            mid: item.mid,
                            title: item.title,
                            date: today
                        })
                    } else {
                        // console.log(niceVideoMap.get(profileid))
                    }
                });
                console.log('获取视频视频个数：---', count);
                if (count >= 100) {
                    callback(conn);
                    return;
                } else {
                    setTimeout(() => {
                        getNiceVideoUrlFunc();
                    }, 60000);
                }
            })
        }
    }
    if (topicTab.name !== 'nice') {
        getVideoUrlFunc();
    } else {
        getNiceVideoUrlFunc()
    }
}
function getProfileById(id, mid) {
    const profileByIdOption = Object.assign({}, option, {
        url: 'https://api.xiaoniangao.cn/profile/get_profile_by_id',
        data: {
            "profile_id":id,
            "profile_mid":mid,
            "qs":"imageMogr2/gravity/center/rotate/$/thumbnail/!400x400r/crop/400x400/interlace/1/format/jpg",
            "h_qs":"imageMogr2/gravity/center/rotate/$/thumbnail/!80x80r/crop/80x80/interlace/1/format/jpg",
            "share_width":625,
            "share_height":500,
            "token":"a12b50a12b60b16274cacf6d50e3f2f9",
            "uid":"3d47d100-6532-4401-9cea-c86882167b62",
            "proj":"ma",
            "wx_ver":"7.0.12",
            "code_ver":"2.13.2",
            "log_common_params":{
                "e":[
                    {
                        "data":{
                            "topic_id":0,
                            "page":"dynamicSharePage"
                        }
                    }
                ],
                "ext":{
                    "brand":"iPhone",
                    "device":"iPhone XS",
                    "os":"iOS 13.4.1",
                    "weixinver":"7.0.12",
                    "srcver":"2.11.1",
                    "net":"wifi",
                    "scene":1089
                }
            }
        }
    })
    return new Promise(async (resolve, reject) => {
        try {
            const body = await axios(profileByIdOption);
            const { ret, data } = body.data;
            if (ret === 1) {
                const { vid } = data;
                resolve(`http://cdn-xalbum2.xiaoniangao.cn/${vid}`)
            } else {
                resolve(null)
            }
        } catch (e) {
            resolve(null)
        }
    })
}

function getProfileSrc (cb) {
    // 根据profileid获取src
    const niceVideoMapKeys = Array.from(niceVideoMap.keys());
    const curProfile = niceVideoMapKeys[profileCount];
    const item = niceVideoMap.get(curProfile)
    getProfileById(item.profileid, item.mid).then(src => {
        console.log(src)
        if (src) {
            profileCount++;
            repeatMap.set(src, {
                src,
                topic: topicTab.title,
                title: item.title,
                date: today
            })
        }
        if (profileCount + 1 === niceVideoMapKeys.length) {
            cb()
            return;
        } else {
            setTimeout(() => {
                getProfileSrc(cb)
            }, 10000)
        }
    })
}
async function write2excel (conn) {
    // const docs = await conn.find({ date: today, topic: topicTab.title }).toArray();
    const docs = Array.from(repeatMap.values())
    const doc_count = await conn.find({ topic: topicTab.title }).count();
    const excel_data = docs.map(doc => ({ title: doc.title, src: doc.src, topic: doc.topic }));
    console.log('数据库已存该tab视频数量:', doc_count);
    console.log('今日下载数量：', excel_data.length)
    let count1 = 1;
    fs.mkdir(`D:\/xiaoniangao\/video_${today}_${topicTab.title}`, { recursive: true }, (err) => {
        if (err) throw err;
        excel_data.forEach((item, index) => {
            let realName = item.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/ig, '');
            // realName = realName.toString('iso8859-1');
            console.log(`${realName}下载中`)
            request(item.src).pipe(fs.createWriteStream(`D:\/xiaoniangao\/video_${today}_${item.topic}\/${item.topic}_${index +doc_count}-${realName}.mp4`)).on('finish', function() {
                console.log('已下载视频个数:', count1);
                const dbInsertData = repeatMap.get(item.src)
                conn.insertOne(dbInsertData)
                console.log('item finish', item.src);
                if (count1 === excel_data.length) {
                    console.log('----                                      ----')
                    console.log('-----                                    -----')
                    console.log('-------                                -------')
                    console.log('-----------                        -----------')
                    console.log('--------------                  --------------')
                    console.log(`-------------${today}视频下载完成-------------`)
                    console.log('--------------                  --------------')
                    console.log('-----------                        -----------')
                    console.log('-------                                -------')
                    console.log('-----                                    -----')
                    console.log('----                                      ----')
                    
                    return false
                } else {
                    count1++;
                }
            }).on('error', function (error) {
                count1++
                if (count1 === excel_data.length) {
                    console.log(`${today}视频下载完成`)
                }
                console.log('error', error, item.src);
            })
        })
    });
    // getvideoData(excel_data, doc_count, conn);
    // const jsonWorkSheet = xlsx.utils.json_to_sheet(excel_data);
    // const workBook = {
    //     SheetNames: ['jsonWorkSheet'],
    //     Sheets: {
    //       'jsonWorkSheet': jsonWorkSheet
    //     }
    // };
    // xlsx.writeFile(workBook, `./xiaoniangao_${today}.xlsx`);
    // sendmail();
}

function getvideoData (arr, doc_count) {
    let count1 = 1;
    fs.mkdir(`D:\/xiaoniangao\/video_${today}`, { recursive: true }, (err) => {
        if (err) throw err;
        console.log(arr)
        arr.forEach((item, index) => {
            let realName = item.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/ig, '');
            console.log(realName)
            // realName = realName.toString('iso8859-1');
            request(item.src).pipe(fs.createWriteStream(`D:\/xiaoniangao\/video_${today}\/${item.topic}_${index +doc_count}-${realName}.mp4`)).on('finish', function() {
                console.log('已完成:', count1);
                count1++;
                console.log('item finish', item.src);
            }).on('error', function (error) {
                console.log('item error', error, item.src);
            })
        })
    });
    
    // function getDataPromise (url, filepath, filename) {
    //     return new Promise(resolve => {
    //         request(url).pipe(fs.createWriteStream(filepath+filename)).on('end', function() {
    //             resolve({});
    //         }).on('error', function () {
    //             resolve();
    //         })
    //     })
    // }
}

// async..await is not allowed in global scope, must use a wrapper
// async function sendmail() {
//     // Generate test SMTP service account from ethereal.email
//     // Only needed if you don't have a real mail account for testing
//     // create reusable transporter object using the default SMTP transport
//     let transporter = nodemailer.createTransport({
//       service: 'qq',
//       port: 465,
//       secure: true, // true for 465, false for other ports
//       auth: {
//         user: '519770277@qq.com', // generated ethereal user
//         pass: 'gmgqchlwprnfcbce', // generated ethereal password
//       },
//     });
//     // 287663982@qq.com,
//     // send mail with defined transport object
//     let info = await transporter.sendMail({
//         from: '"shiro" <519770277@qq.com>', // sender address
//         to: "287663982@qq.com,519770277@qq.com", // list of receivers
//         subject: `小年糕视频链接${today}`, // Subject line
//         text: `小年糕视频链接${today}`, // plain text body
//         html: "", // html body
//         attachments: [
//             {
//                 filename : `xiaoniangao_${today}.xlsx`,
//                 path: `./xiaoniangao_${today}.xlsx`
//             }
//         ]
//     });
  
//     // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
//     // Preview only available when sending through an Ethereal account
//     // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
//   }

