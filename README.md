## 🔗 LinkBoard  (name is tentative) 
#### 🚨🚧 This project is currently in a "late stage prototype" status. Some features are broken, there are code conflicts and a lot of clean-up to be done. Considerate it a late Alpha or early Beta. 🚧

LinkBoard is an app to create lists of often used bookmarks for specific niches or projects. It started as a quick and dirty vibe coded project, specifically for coding and web development links, but I have started to clean it up for public use. Right now, you can drag the links from one category to another.

###  Table of Contents
- [ Features](#-features)
- [ Issues](#-issues)
- [ Future Plans](#-future-plans)

###  Screenshot
![App screenshot](https://raw.githubusercontent.com/KevanMacGee/LinkBoard/refs/heads/master/screenshots/Screenshot2025-09-26-192559.png)

###  Features
- Bookmarks can be added and sorted into topic areas upon creation, but they are also "drag-and-dropable" later.
- The app automatically pulls the favicon for any link that is added. 
- Data can be exported into a JSON file, and similarly imported from the same.
- Columns can be created, deleted and reordered by clicking the Manage Columns button.
- Cards (they hold the bookmarks) can be edited and deleted by clicking the pen icon on them.

###  Issues
- There are some design and visual inconsistencies. (Update: Many have been addressed and it's getting down to the last several personal nick-picky visual issues.)
- Due to browser restrictions, the bookmarklet feature does not work if you use a local copy of the app from your computer's disk drive. To use the bookmarklet, you would have to deploy it to something like Cloudflare or a traditional web server. 
  - You could server the local file as a local server, but it would always have to be running.
  - This might be solved by replacing the bookmarklet with an actual browser extension.

- Fixed! ~~There is a slight bug where if you drag a link from one column to another and drop it in the empty space at the bottom of a column, it doesn't register. In short, if you drag a link from one column, it has to pass over a link in the new column before the app registers it's being moved.~~
- Local storage can inherently be flaky, I plan to move to a proper database solution.
- Fixed! ~~The code is currently inline and unwieldy, that is a relic of the app being vibe coded in the beginning.~~

###  Future Plans
- Done. ~~Clean the code from inline css and js to proper organization.~~
- ~~Move some of the buttons to a collapsible sidebar.~~ This is going to be a modal in the short term, will come along when I add user accounts.
- Move from data being handled by local storage to a a database.
- (Maybe) Replace the "bookmarklet" feature with a full browser extension. The bookmarklet feature works just fine if the app is hosted online or if it is served through a local server using local host or the like. I personally prefer to use this app as a static, non-hosted copy on my machine, and the browser prevents the bookmarklet from working in that configuration. I will have to judge user interest and if users commonly want to use it but just saving the .html file and double clicking it to open it and use it statically.

