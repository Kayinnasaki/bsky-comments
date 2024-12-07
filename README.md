# Bluesky Embedded Threads/Comments
*For Blog Comments or whatever you want, really*

I saw this done a few places and tried to do it myself, but most of the solutions were too complicated. Not in terms of code, but just... dependencies, and build systems, and whatever. I wanted something dirt simple that someone could embed on a neocities page if they wanted, and modify without the need of setting anything complicated up.

So this is a simple script where you pass in a thread as an `at://` protocol link, and it gives you back the entire thread (except for the initial message) as a html thread, with little cute social media metrics. *Great!*

## How to Use it

The thread embedder is simple but not without its caveats. First, you need the bluesky thread BEFORE you add comments, meaning you need to post your article, post on bluesky, then go back to add the comments now that you have a link. As such, this isn't a perfectly automatic method that you can simply set and forget.

A minimal version of the comment embed is included.

```html
<!DOCTYPE html>
<html>

<head>
    <title>Comments</title>
    <link rel="stylesheet" href="comments.css">
    <script src="comments.js"></script>
</head>

<body>
    <div id="comments-container"></div>
    <script>
        // Loads comments from a post's URI and user DID
        loadComments("at://did:plc:scmcyemdposb4vuidhztn2ui/app.bsky.feed.post/3lbb32nb4322g")

        // Loads comments from a post's URL
        //loadCommentsURL("bsky.app/profile/kayin.moe/post/3lbb32nb4322g")

        // Sets custom templates before loading comments
        //loadCommentTemplate("comments.template.html")
        //loadMetricTemplate("metrics.template.html")
        //loadComments("at://did:plc:scmcyemdposb4vuidhztn2ui/app.bsky.feed.post/3lbb32nb4322g")

        // Sets custom options as an object, including sorting by creation date, as well as having descending posts
        //loadComments("at://did:plc:scmcyemdposb4vuidhztn2ui/app.bsky.feed.post/3lbb32nb4322g", { "renderOptions": { "commentTemplate": 'comments.template.html', "headerTemplate": 'header.template.html', "sortOptions": { "tsKey": 'createdAt', "order": 'desc' } } })
    </script>
</body>
</html>
```

The key point is that you call either **loadCommentsURL** or **loadComments** (just uncomment the one you wanna try) with an appropriate info. The `did:plc` bit is your actual user code, which [you could get here](https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=kayin.moe)*(using my handle as an example).*, and the last bit `3lbb32nb4322g` is the Post ID, which can be replaced by whatever string is the end of the post you want to use. 

LoadCommentsURL saves you from worrying about what your DID but it makes two API calls instead of one, so it renders slower. This isn't super important, but it's preferable to use loadCommentsURL if you can hardcode your DID. The difference in speed is pretty significant, a second or two vs almost instant, but in the context of a comment section under a blog post this might not matter much for you.

You also have access to very simple **templates**, which you can invoke with **loadCommentTemplate**(for the comments) and **loadMetricTemplate**(for the header), giving a bit more flexibility. The included example templates are the default, but these files are not needed by the script if you want to run with completely default settings.

These can be folded up into an object that can be sent with loadComments like 

```js
loadComments("at://did:plc:scmcyemdposb4vuidhztn2ui/app.bsky.feed.post/3lbb32nb4322g", { "renderOptions": { "commentTemplate": 'comments.template.html', "headerTemplate": 'header.template.html', "sortOptions": { "tsKey": 'createdAt', "order": 'desc' } } })
```

**sortOptions** include setting the tsKey for sorting. Bluesky posts can *lie* so using **createdAt** can sort posts by their actual creation date, not their display date. **order** can be 'asc' or 'desc'. `asc` is the default you'd expect, but `desc` puts newest posts first.

Depending on your setup, sometimes you need to delay calling either function. On my blog (which is running on grav) I use...

```html
  <script>
    window.addEventListener('load', (event) => {
      console.log('The page has fully loaded');
      const comments = "{{ page.header.comments|e('js') }}"; // Escape the value for JS safety
      loadComments("at://did:plc:" + did + "/app.bsky.feed.post/" + comments);
    });
  </script>
```

This also shows a situation where I got my DID set as a public variable so I don't have to worry about it. All I need is my post ID.

The only other important thing is having a div with the id `comments-container`, which will get filled up once everything is pulled down and processed.

If you wanna see how things look, and what works, the example thread is filled with different types of embedded content, some of which is or isn't supported. The **index.html** file will work without a live server, just open it up and poke around.

You can also see an example [over on my blog](https://kayin.moe/why-play-a-remake#comments-container)

### What works

- The basic stuff works!
- Embeds work
- Posts hidden on a thread will be hidden here!
- Highlights and prioritizes the comments made by the original poster
- Templates!

### What doesn't work
- ~~Embedded links and youtube videos and stuff *(KINDA implemented, but not really)*~~
- Hiding people who don't want to be seen by offline people
- Any kind of automated posting workflow *(probably will never have one)*

### What needs to be done
- ~~Clean up the bad LLM code that I used to get started~~ *(kinda rewrote a bunch???)*
- ~~Make it so someone can just provide a post URL and have the script figure out the details.~~
- Better Handling of multi image threads
- Maybe more example implementations? 

This project is under the Unlicense. You can do what you will with it and modify it as you like. I feel like you have to modify it to do anything useful with it. You are under no obligation to credit me or send any feature improvements back, but please consider it! Also while you don't gotta, I'd love if you told me if you used this over [on bluesky](https://bsky.app/profile/kayin.moe).