/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
const got = require('got');
const twitterToken = process.env.TWITTER_TOKEN

//configurations
const webhookEndPoint = process.env.DISCORD_ENDPOINT
const search_term = process.env.SEARCH_TERM
const discord_bot_name = process.env.BOT_NAME
const discord_bot_header = process.env.BOT_HEADER

//interval in hours
const interval = 0.5

exports.helloPubSub = (event, context) => {
  searchAndPostTweet().then(() => {})
};


async function searchTweets(){
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(search_term)}&tweet.fields=referenced_tweets,author_id,created_at`
	const {body} = await got.get(url, {
		responseType: 'json',
    headers: {
      'Authorization': `Bearer ${twitterToken}`,
    },
    });
    return body
}

async function searchAndPostTweet(){
  const result = await searchTweets()
  if(result.meta.result_count != 0){
    startTime = Date.now() - (interval * 60 * 60 * 1000)
    const filteredTweets = result.data.filter((item) => checkRefTweet(item)).filter((item) => Date.parse(item.created_at) >= startTime)
    const tweetUrls = await Promise.all(filteredTweets.map((item) => createTweetUrls(item)))
    if(tweetUrls.length > 0){
      await postToDiscord(tweetUrls)
    }
  }
};

async function createTweetUrls(tweet){
	const {body} = await got.get(encodeURI(`https://api.twitter.com/2/users/${tweet.author_id}`), {
		responseType: 'json',
    headers: {
      'Authorization': `Bearer ${twitterToken}`,
    },
    });

    author_name = body.data.username;
    return `https://twitter.com/${author_name}/status/${tweet.id}`
}

async function postToDiscord(urls){
  const {body} = await got.post(webhookEndPoint, {
		json: {
			username: discord_bot_name,
			content: `${discord_bot_header}\r\n${urls.join('\r\n')}`
		},
		responseType: 'json'
	});
  
}

function checkRefTweet(item){
  if(item.referenced_tweets != undefined){
    return (item.referenced_tweets.filter((ref) => ref.type == "retweeted").length == 0)
  }else{
    return true
  }
}