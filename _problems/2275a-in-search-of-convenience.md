---
# generated: build_problems.py
pid: "2275A"
title: "2275A In Search of Convenience"
---
{% raw %}
## My notes

CF Div 3 A - In Search of Convenience (redone from scratch, my own code)

Find ANY integer point exactly R away from (x0, y0).

"Output any" means look for the EASIEST construction first.

Step R to the right: (x0 + R, y0).

The gaps are R across and 0 up, so the distance is sqrt(R^2 + 0) = R.

No loops to search and no

## Code

```cpp
#include <iostream>

int main(){

    int t {};
    std::cin >> t;

    for (int i = 0; i < t ; i++){
        int x {};
        int y {};
        int R {};

        std::cin >> x;
        std::cin >> y;
        std::cin >> R;

        std::cout << x + R << ' ' << y << '\n';
        



    }
    




    return 0;
}
```

{% endraw %}
