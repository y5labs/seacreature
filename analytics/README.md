# Seacreature Analytics

  At the moment we have a forward_link and backward_link for each link. These datasets have very similar information and function in similar ways. They map from an ID to a set of IDs and back again. Nulls going forward are kept in a separate Set along with nulls going backwards.

  Each destination (forward and backwards) keeps a track of the reference counts pointing to it. These increase as additional relationships are formed and they decrease when filtered or values are deleted. When a reference count reaches zero that entry is removed from current filter. When it goes from zero to a positive number it's added back in and now visible.
  
  The difficulty lies when new entries are added. Backward links use a static lookup so don't have their relation mapping and reference counts updated when new values are added. These changes are also not published across to other cubes so when new values are added to a cube that could potentially make entries visible in other cubes there is no way to communicate this information.
  
  A new structure needs to be created that represents and tracks both relationships at the same time. It would include functionality for both forward and backward link management including detecting changes across both cubes.

## Questions
- How can the seacreature analytics codebase be more testable and discoverable?
- Should bit indicies be created for dimensions rather than they create themselves?
- Should communications from dimensions back to cubes be duplex and single channel?
- Can a test harness for the new link relationships manager be created?

# Performance
`node --prof ./scratch.js`
`node --prof-process --preprocess -j isolate*.log | flamebearer`
