import unittest
from app import app

class FlaskAppTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_homepage_redirect(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 302)
        self.assertIn('/home/', res.headers['Location'])

    def test_homepage(self):
        res = self.client.get('/home/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'PRISM', res.data)

    def test_home_static(self):
        res = self.client.get('/home/style.css')
        self.assertEqual(res.status_code, 200)
        res_js = self.client.get('/home/script.js')
        self.assertEqual(res_js.status_code, 200)

    def test_game_route(self):
        res_redirect = self.client.get('/game')
        self.assertEqual(res_redirect.status_code, 302)
        res = self.client.get('/game/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Mochi', res.data)

    def test_game_static(self):
        res_css = self.client.get('/game/style.css')
        self.assertEqual(res_css.status_code, 200)
        res_js = self.client.get('/game/script.js')
        self.assertEqual(res_js.status_code, 200)

    def test_portfolio_route(self):
        res_redirect = self.client.get('/portfolio')
        self.assertEqual(res_redirect.status_code, 302)
        res = self.client.get('/portfolio/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'The Creative Desk', res.data)
        # Verify preservation of Homework 7 link
        self.assertIn(b'https://anabiaobaid-cmd.github.io/Heuser-CS_CRP-Homework_6/', res.data)

    def test_portfolio_static(self):
        res_css = self.client.get('/portfolio/style.css')
        self.assertEqual(res_css.status_code, 200)
        res_js = self.client.get('/portfolio/script.js')
        self.assertEqual(res_js.status_code, 200)
        res_img = self.client.get('/portfolio/assets/profile.jpg')
        self.assertEqual(res_img.status_code, 200)

    def test_api_route(self):
        res_redirect = self.client.get('/api')
        self.assertEqual(res_redirect.status_code, 302)
        res = self.client.get('/api/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'POK', res.data)
        self.assertIn(b'PRISM', res.data)

    def test_api_static(self):
        res_css = self.client.get('/api/style.css')
        self.assertEqual(res_css.status_code, 200)
        res_js = self.client.get('/api/script.js')
        self.assertEqual(res_js.status_code, 200)

    def test_api_pokemon_proxy(self):
        res = self.client.get('/api/pokemon/pikachu')
        self.assertEqual(res.status_code, 200)
        json_data = res.get_json()
        self.assertEqual(json_data['name'], 'pikachu')
        self.assertEqual(json_data['id'], 25)

    def test_custom_404(self):
        res = self.client.get('/nonexistent-route')
        self.assertEqual(res.status_code, 404)
        self.assertIn(b'404', res.data)

if __name__ == '__main__':
    unittest.main()
