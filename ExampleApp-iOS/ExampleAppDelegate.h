#import <UIKit/UIKit.h>
#import "WebViewJavascriptBridge.h"

@interface ExampleAppDelegate : UIResponder <UIApplicationDelegate>

@property (strong, nonatomic) UIWindow *window;
@property (strong, nonatomic) WebViewJavascriptBridge *javascriptBridge;
@property (strong, nonatomic) UIViewController *vc;

- (void)renderButtons:(UIWebView*)webView;
- (void)loadExamplePage:(UIWebView*)webView;

@end
