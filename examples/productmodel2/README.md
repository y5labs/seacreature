# Product Model

del - find all of that index and remove
put - add to the index ignoring duplicates


Bug:
1. Filter by top OrderItem (60 ✕ Côte de Blaye @ 26350: $1581000)
2. Filter by Product (Côte de Blaye)
3. Clear OrderItem filter
4. All products show

Issue is that intermediate connections for projections that travel through the graph get altered by filters on the intermediate data. Need to calculate diffs as a result. Perhaps a library that helps?

project(orderitems, [ product, supplier ])
project(orderitems, [ order, customer ])


Check mutex? How to stop continual propigation?

- [ ] Matrix (Top Products x Top Customers)
- [ ] OmniSearch
- [ ] EnabledFilters
