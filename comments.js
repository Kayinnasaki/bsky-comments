// SVGs
let heart  = '<svg xmlns="http://www.w3.org/2000/svg" fill="#71153b" viewBox="0 0 24 24" stroke-width="1.5" stroke="#71153b class="size-5" color="pink"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"></path></svg>'
let repost = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="green" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"></path></svg>`
let reply  = `<svg xmlns="http://www.w3.org/2000/svg" fill="#7FBADC" viewBox="0 0 24 24" stroke-width="1.5" stroke="#7FBADC" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"></path></svg>`

let postTemplate   = null; // Change by doing something like: loadCommentTemplate("comments.template.html")
let headerTemplate = null; // Same Deal, but with loadHeaderTemplate
let subTemplate  = null; // For chaining same author replies

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadCommentTemplate(url) {
  postTemplate = await loadTemplate(url);
}

async function loadHeaderTemplate(url) {
  headerTemplate = await loadTemplate(url);
}

async function loadSubTemplate(url) {
  subTemplate = await loadTemplate(url);
}

// loads optional templates
async function loadTemplate(url) {
  const response = await fetch(url);
  return response.text();
}

// inspired by czue (https://github.com/czue/bluesky-comments)
// query the author's page to discover the post
async function discoverPost(authorHandle, options={}) {
  const currentUrl = options.renderOptions?.discoverURL || window.location.href;
  const discoverType = options.renderOptions?.discoverType || "oldest";
  const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=*&url=${encodeURIComponent(
    currentUrl
  )}&author=${authorHandle}&sort=${discoverType}`;
  console.log(apiUrl);
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.posts && data.posts.length > 0) {
      // "oldest" isn't real, so sending sort=oldest just gives us Latest, so we take the last post.
      const post = discoverType === "oldest" ? data.posts[data.posts.length - 1] : data.posts[0];
      loadComments(post.uri, options);
    } else {
      console.log('No matching post found linking to ' + currentUrl);
    }
  } catch (err) {
    console.log('Error attempting to fetch post at ' + currentUrl);
  }
}

// finds the user DID and loads the comments automatically from a simple URL
async function loadCommentsURL(url, options={}) {
  const API_URL = "https://bsky.social/xrpc/com.atproto.identity.resolveHandle";
  const trimmed = url.split("/profile/").slice(1).join("");
  const user = trimmed.split("/post/")[0];
  const post = trimmed.split("/post/")[1];

  console.log(user + " " + post);

  async function getDID(user) {
    const did = `${API_URL}?handle=${encodeURIComponent(user)}`;
    try {
      const response = await fetch(did);
      if (!response.ok) throw new Error("Failed to fetch User DID");
      const data = await response.json();
      console.log("Fetched comment data:", data); // Debugging
      return data.did;
    } catch (error) {
      console.error("Error fetching User DID:", error);
      return null;
    }
  }

  const did = await getDID(user);
  console.log(did);
  loadComments("at://" + did + "/app.bsky.feed.post/" + post, options);
}

// Basic, faster way to load comments. It gets called either way.
// if options has a renderOptions key, its value is passed to renderComments.
async function loadComments(rootPostId, options={}) {
  const API_URL = "https://api.bsky.app/xrpc/app.bsky.feed.getPostThread";
  let hostAuthor = ""

  async function fetchComments(postId) {
    const url = `${API_URL}?uri=${encodeURIComponent(postId)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      console.log("Fetched comment data:", data); // Debugging
      return data;
    } catch (error) {
      console.error("Error fetching comments:", error);
      return null;
    }
  }

  // Converts one of those at:// uris into an actual link usable by humans
  function convertURI(uri) {
    const url = uri.replace("at://", "https://bsky.app/profile/").replace("/app.bsky.feed.post/", "/post/");
    return (url);
  }

  //See: https://docs.bsky.app/docs/advanced-guides/timestamps#sortat
  function calculateSortAtTimestamp(post) {
    createdAt = new Date(post.record?.createdAt).getTime();
    indexedAt = new Date(post?.indexedAt).getTime();
    if (createdAt < 0) {
      return 0;
    } else if (createdAt <= indexedAt) {
      return createdAt;
    } else if (createdAt > indexedAt) {
      return indexedAt;
    }
  }

  // See: https://docs.bsky.app/docs/advanced-guides/timestamps
  // Default to 'sortAt' but allow specifying other timestamps.
  function sortCommentsByTime(comments, options) {
    let tsKey = options?.tsKey ?? 'sortAt';
    let order = options?.order ?? 'asc';

    if (!['sortAt', 'createdAt', 'indexedAt'].includes(tsKey)) {
        // Invalid ts key value
        console.log("Invalid tsKey value " + tsKey + " passed to sortCommentsByTime! Setting to default value 'sortAt'.");
        tsKey = 'sortAt';
    }

    if (!['asc', 'desc'].includes(order)) {
        // Invalid order value
        console.log("Invalid order value " + order + " passed to sortCommentsByTime! Setting to default value 'asc'.");
        order = 'asc';
    }

    // Sort Order Fuckery
    const sortMultiplier = order === 'asc' ? 1 : -1;

    return comments.sort((a, b) => {
        if (tsKey === 'sortAt') {
            // Calculate sortAt timestamp
            const timeA = calculateSortAtTimestamp(a.post);
            const timeB = calculateSortAtTimestamp(b.post);
            return (timeA - timeB) * sortMultiplier;
        } else {
            const timeA = new Date(a.post.record?.[tsKey]).getTime();
            const timeB = new Date(b.post.record?.[tsKey]).getTime();
            return (timeA - timeB) * sortMultiplier;
        }
    });
}

  // Can things be multiple kinds of embeds at once????
  function renderEmbeds(embed) {
    const embedBox = document.createElement("div")

    // I heard you like posts in your posts
    if (embed && embed.$type === "app.bsky.embed.record#view") {
      const embedded = convertURI(embed.record.uri);
      embedBox.classList.add("comment-repost");
      embedBox.appendChild(renderPost(embed));
    }

    // Better Mason view/Cover CSS?
    if (embed && embed.$type === "app.bsky.embed.images#view") {
      const images = embed.images;
      if (images && images.length > 0) {
        embedBox.classList.add("comment-imagebox")
        images.forEach(image => {
          const img = document.createElement("img");
          const link = document.createElement("a");
          link.href = image.fullsize;
          img.src = image.thumb;
          img.alt = image.alt || "Image attachment";
          img.classList.add("comment-image");
          link.appendChild(img);
          embedBox.appendChild(link);
        });
      }
    }

    // Links and stuff, using Bluesky's preview images. I need to find a good link without an image card to test the Else.
    if (embed && embed.$type === "app.bsky.embed.external#view") {
      const link = embed.external;
      const linkThumb = embed.external.thumb;
      const linkTitle = embed.external.title;
      if (embed.external.thumb) {
        embedBox.innerHTML = `
          <div class="comment-embedbox-thumb">
            <a href="${link.uri}">
              <img src="${linkThumb}">
              <p><strong>${linkTitle}</strong></p>
              <p>${link.description}</p>
            </a>
          </div>`;
      } else {
        embedBox.innerHTML = `<a href="${link}"><div class="comment-embedbox">[Link to <em>${linkTitle}<em>]</div></a>`;
      }
    }

    return embedBox
  }

  // Renders 1(one) post. Might be worth making this easier to call for single post embeds.
  function renderPost(comment) {
    const post = document.createElement("div");
    post.classList.add("comment-box");

    // Embeds and Posts have data in slightly different places. This feels flimsy? 
    const author = comment.post?.author ?? comment.record?.author ?? "";
    const record = comment.post?.record ?? comment.record?.value ?? "";
    const embeds = comment.post?.embed ?? comment.record?.embeds[0] ?? "";
    const uri = comment.post?.uri ?? comment.record?.uri ?? "";

    // So the host can get fancy CSS and look extra important
    if (author.displayName == hostAuthor) {
      post.classList.add("comment-host");
    }

  // Render Comments with either the default or an external file
  const template = postTemplate || `
    <div class="comment-innerbox">
      <img class="comment-avatar" src="{{avatar}}">
      <div>
        <span class="comment-meta">
          By <a href="https://bsky.app/profile/{{handle}}">
            {{name}}
          </a> on 
          <a href="{{url}}">{{date}}</a>
        </span>
        <p class="comment-text">{{text}}</p>
      </div>
    </div>
    {{embeds}}
  `;

  // Prep Embds
  const embedsHTML = renderEmbeds(embeds)?.outerHTML || "";

  post.innerHTML = template
    .replace(/{{avatar}}/g, author.avatar || "")
    .replace(/{{name}}/g, escapeHTML(author.displayName || author.handle || "Unknown"))
    .replace(/{{handle}}/g, author.handle || "")
    .replace(/{{text}}/g, escapeHTML(record?.text || ""))
    .replace(/{{date}}/g, new Date(record?.createdAt || Date.now()).toLocaleString())
    .replace(/{{url}}/g, convertURI(uri))
    .replace(/{{embeds}}/g,embedsHTML)

  return post;
}

  // TO-DO... No prioritization? Author Override?
  // if options contains a "tsKey" key, its value is passed to sortCommentsbyTime.
  function sortComments(comments, options={}) {
    console.log(options)
    if (options?.priority === "none") {
      const orderedComments = [...sortCommentsByTime(comments, options)];
      return orderedComments;
    } else {
      const prioritizedReplies = comments.filter(
        comment => comment.post?.author?.displayName === hostAuthor
      );
      const otherReplies = comments.filter(
        comment => comment.post?.author?.displayName !== hostAuthor
      );

      const orderedComments = [...prioritizedReplies, ...sortCommentsByTime(otherReplies, options)];
      return orderedComments;
    }
  }

  // Iterates through the whole thread.
  // if options contains a "sortOptions" key, its value is passed to sortComments
  function renderComments(comments, container, hiddenReplies, options={}) {
    const orderedComments = sortComments(comments, options?.sortOptions);
    const merge = options?.mergeChains || false; 
    console.log(options);

    orderedComments.forEach(comment => {
      if (!comment.post) {
        console.warn("Skipping comment without post:", comment);
        return;
      }

      // Removing posts that have been hidden from the thread.
      if (hiddenReplies.includes(comment.post.uri)) {
        console.warn("Skipping hidden post");
        return;
      }

      // Check if the post has only one reply and it's from the same author
      if ( merge && comment.replies && comment.replies.length === 1 && comment.replies[0].post.author.did === comment.post.author.did) {
        let concatenatedText = comment.post.record.text;
        let currentComment = comment;

        // Concatenate the replies into a single message with <br> tags
        while (currentComment.replies && currentComment.replies.length === 1 && currentComment.replies[0].post.author.did === currentComment.post.author.did) {
          const template = subTemplate || `
            <div class="subcomment"><a href="{{url}}">↪ {{date}}</a></div>
            {{text}}
            {{embeds}}
          `;

          // Prep Embeds
          const embedsHTML = renderEmbeds(currentComment.replies[0].post.embed)?.outerHTML || "";

          concatenatedText += template
            .replace(/{{avatar}}/g, currentComment.replies[0].post.author.avatar || "")
            .replace(/{{name}}/g, escapeHTML(currentComment.replies[0].post.author.displayName || currentComment.replies[0].post.author.handle || "Unknown"))
            .replace(/{{handle}}/g, currentComment.replies[0].post.author.handle || "")
            .replace(/{{text}}/g, escapeHTML(currentComment.replies[0].post.record.text || ""))
            .replace(/{{date}}/g, new Date(currentComment.replies[0].post.record.createdAt || Date.now()).toLocaleString())
            .replace(/{{url}}/g, convertURI(currentComment.replies[0].post.uri))
            .replace(/{{embeds}}/g, embedsHTML);

          currentComment = currentComment.replies[0];
        }

        // Render the concatenated message as a single comment
        const concatenatedComment = {
          ...comment,
          post: {
            ...comment.post,
            record: {
              ...comment.post.record,
              text: concatenatedText
            }
          },
          replies: currentComment.replies // Continue with remaining replies
        };

        const postElement = renderPost(concatenatedComment);
        postElement.querySelector('.comment-text').innerHTML = concatenatedText; // Use innerHTML to render <br> tags
        container.appendChild(postElement);

        // Recursively render remaining replies
        if (currentComment.replies && currentComment.replies.length > 0) {
          const repliesContainer = document.createElement("div");
          repliesContainer.classList.add("comment-replies");
          renderComments(sortCommentsByTime(currentComment.replies, options?.sortOptions), repliesContainer, hiddenReplies, options);
          container.appendChild(repliesContainer);
        }
      } else {
        container.appendChild(renderPost(comment));

        // Recursively pull out replies to replies
        if (comment.replies && comment.replies.length > 0) {
          const repliesContainer = document.createElement("div");
          repliesContainer.classList.add("comment-replies");
          renderComments(sortCommentsByTime(comment.replies, options?.sortOptions), repliesContainer, hiddenReplies, options);
          container.appendChild(repliesContainer);
        }
      }
    });
  }

  // Actual Logic begins here!!

  // Loads Custom Templates from option object
  if (options?.renderOptions?.commentTemplate) { loadCommentTemplate(options.renderOptions.commentTemplate); }
  if (options?.renderOptions?.headerTemplate)  { loadHeaderTemplate(options.renderOptions.headerTemplate); }

  const commentData = await fetchComments(rootPostId);

  if (commentData && commentData.thread) {
    const postURL = convertURI(rootPostId);
    const commentHidden = [];
    
    if (commentData.threadgate?.record?.hiddenReplies) {
      commentHidden.push(...commentData.threadgate.record.hiddenReplies);
    }

    // Render Header with either the default or an external file
    const container = document.getElementById("comments-container");
    const template = headerTemplate || `
      <p class="comment-metricsbox"><a class="comment-metricslink" href="{{url}}">
        <span class="comment-metrics">{{heart}} {{likeCount}} Likes</span> 
        <span class="comment-metrics">{{repost}} {{repostCount}} Reposts</span>
        <span class="comment-metrics">{{reply}} {{replyCount}} Replies</span></a>
        <a style="color: inherit;text-decoration: inherit" href="#comments-container"><div><h3>Comments</h3></div></a>
        Reply on Bluesky <a href="{{url}}">to this post</a> to add a Comment   
      </p>`;

    container.innerHTML = template
      .replace(/{{heart}}/g, heart || "")
      .replace(/{{repost}}/g, repost || "")
      .replace(/{{reply}}/g, reply || "")
      .replace(/{{url}}/g, postURL || "")
      .replace(/{{likeCount}}/g, commentData.thread.post.likeCount || "")
      .replace(/{{repostCount}}/g, commentData.thread.post.repostCount + commentData.thread.post.quoteCount || "")
      .replace(/{{replyCount}}/g, commentData.thread.post.replyCount || "")

    // Render only replies, omitting the root post
    if (commentData.thread.replies && commentData.thread.replies.length > 0) {
      hostAuthor = commentData.thread.post.author.displayName

      // Override host for comment prioritization. Should use DID but right now i'm lazy and just want "none" to work
      // To-Do: Have it figure out if its a DID or a handle and precede accordingly.
      if (options?.renderOptions?.sortOptions?.priority && options?.renderOptions?.sortOptions?.priority  !== "none") {
        hostAuthor = options.renderOptions.sortOptions.priority ;
      }

      renderComments(sortCommentsByTime(commentData.thread.replies, options?.renderOptions?.sortOptions), container, commentHidden, options?.renderOptions);
    }
  }
}