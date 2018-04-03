
# Infinite-list
An exercise in long document scrolling experiences

Necessary packages are included; requires to start node server from project directory:

$ nodemon server.js

A live version of this detailed writeup / exercise can be found [here](#):
Brute Force Approach:

Core functionality depends on supplying a new DOM node for each datum retrived in the messages api; this leads to
an eventual performance degradation with O(n) growing set of nodes; Coupled with swipe listners on each node,
it would be best to recycle DOM nodes as we scroll down the list, instead of appending them each time.

Recyclable DOM elements:

By running a sentinel element behind a fixed length list of elemnents, we could increase the size of the document by growing the sentinel's height, replace nodes out of the viewport to the end of the list. Subsequently, nodes placed ahead of the viewport can be populated with the next set of message data. This preserves scroll position and creates the illusion of a never-ending list without compromise to the browsers native scrollbar behaviour. The same mechanism replaces messages to the start of the DOM element list, replacing data from a cache, to avoid unnecessary API calls.

Swiping messages removes them from the message flow, and fetches messages to replace those removed without detriment to the scroll/replace mechanism.

This would provide a fixed set of DOM elements, and event listeners, with performance falling on the browser's ability to keep up in rendering elements on a really fast scroll.
