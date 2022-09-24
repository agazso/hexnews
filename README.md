## HexNews

To build the demo:
```
npm run build
```

Then open `dist/index.html`

### Bundle structure
```
dist/
├─ index.html
├─ hexnews.js
├─ hexnews.js.min
├─ snapshot.json
```

### Database architecture

```
event database => indexed database -+
                                    |
                                    +-> app db
                                    |
source code ------------------------+
```
