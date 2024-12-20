import dropbox
from dropbox import DropboxOAuth2FlowNoRedirect

app_key = input("Enter the Dropbox app key here: ").strip()
app_secret = input("Enter the dropbox app secret: ").strip()

auth_flow = DropboxOAuth2FlowNoRedirect(app_key, app_secret, token_access_type="offline")

authorize_url = auth_flow.start()
print("1. Go to: " + authorize_url)
print("2. Click \"Allow\" (you might have to log in first).")
print("3. Copy the authorization code.")
auth_code = input("Enter the authorization code here: ").strip()

try:
    oauth_result = auth_flow.finish(auth_code)
except Exception as e:
    print('Error: %s' % (e,))
    exit(1)

with dropbox.Dropbox(oauth2_access_token=oauth_result.access_token) as dbx:
    dbx.users_get_current_account()
    print("----------------------------------------")
    print("Successfully set up client!")
    print("----------------------------------------")
    print("DROPBOX_REFRESH_TOKEN:", oauth_result.refresh_token)
    print("----------------------------------------")