const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* About */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">BlogApp</h3>
                        <p className="text-gray-400">
                            Share your thoughts and ideas with the world.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li><a href="/" className="hover:text-white">Home</a></li>
                            <li><a href="/blogs" className="hover:text-white">Blogs</a></li>
                            <li><a href="/profile" className="hover:text-white">Profile</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">Contact</h3>
                        <ul className="space-y-2 text-gray-400">
                            <li>Email: contact@blogapp.com</li>
                            <li>Phone: +1 234 567 890</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-4 text-center text-gray-400">
                    <p>&copy; 2026 BlogApp. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;